import { ObjDefine } from 'ui/utils/obj_define';
import { FieldFormat } from 'ui/../field_formats/field_format';
import { fieldFormats } from 'ui/registry/field_formats';
import { getKbnFieldType } from './kbn_field_types';
import { shortenDottedString } from 'ui/../../core_plugins/kibana/common/utils/shorten_dotted_string';
import { toastNotifications } from 'ui/notify';
import chrome from 'ui/chrome';
import * as field  from 'ui/index_patterns/_field';

field.Field = function (indexPattern, spec) {

  // unwrap old instances of Field
    if (spec instanceof field.Field) spec = spec.$$spec;

  // construct this object using ObjDefine class, which
    // extends the Field.prototype but gets it's properties
    // defined using the logic below
    const obj = new ObjDefine(spec, field.Field.prototype);

    if (spec.name === '_source') {
      spec.type = '_source';
    }

    // find the type for this field, fallback to unknown type
    let type = getKbnFieldType(spec.type);
    if (spec.type && !type) {
    toastNotifications.addDanger({
      title: `Unknown field type ${spec.type}`,
      text: `Field ${spec.name} in indexPattern ${indexPattern.title} is using an unknown field type.`
    });
    }

    if (!type) type = getKbnFieldType('unknown');

    let format = spec.format;
    if (!format || !(format instanceof FieldFormat)) {
      format = indexPattern.fieldFormatMap[spec.name] || fieldFormats.getDefaultInstance(spec.type);
    }

    const indexed = !!spec.indexed;
    const scripted = !!spec.scripted;
    const searchable = !!spec.searchable || scripted;
    const aggregatable = !!spec.aggregatable || scripted;
    const readFromDocValues = !!spec.readFromDocValues && !scripted;
    const sortable = spec.name === '_score' || ((indexed || aggregatable) && type.sortable);
    const filterable = spec.name === '_id' || scripted || ((indexed || searchable) && type.filterable);
    const visualizable = aggregatable;
    const nestedPath = spec.nestedPath;
    const displayPriority = spec.displayPriority || 1;

    obj.fact('name');
    obj.fact('type');
    obj.writ('count', spec.count || 0);

    // scripted objs
    obj.fact('scripted', scripted);
    obj.writ('script', scripted ? spec.script : null);
    obj.writ('lang', scripted ? (spec.lang || 'painless') : null);

    // stats
    obj.fact('searchable', searchable);
    obj.fact('aggregatable', aggregatable);
    obj.fact('readFromDocValues', readFromDocValues);
    obj.writ('nestedPath', nestedPath);
    obj.writ('displayPriority', displayPriority);

    // usage flags, read-only and won't be saved
    obj.comp('format', format);
    obj.comp('sortable', sortable);
    obj.comp('filterable', filterable);
    obj.comp('visualizable', visualizable);

    // computed values
    obj.comp('indexPattern', indexPattern);
    obj.comp('displayName', chrome.getUiSettingsClient().get('shortDots:enable') ? shortenDottedString(spec.name) : spec.name);
    obj.comp('$$spec', spec);

    // conflict info
    obj.writ('conflictDescriptions');

    return obj.create();
  };

Object.defineProperties(field.Field.prototype, {
    indexed: {
        get() {
            throw new Error('field.indexed has been removed, see https://github.com/elastic/kibana/pull/11969');
        }
    },
    analyzed: {
        get() {
            throw new Error('field.analyzed has been removed, see https://github.com/elastic/kibana/pull/11969');
        }
    },
    doc_values: {
        get() {
            throw new Error('field.doc_values has been removed, see https://github.com/elastic/kibana/pull/11969');
        }
    },
});

field.Field.prototype.routes = {
  edit: '/management/kibana/indices/{{indexPattern.id}}/field/{{name}}'
};
