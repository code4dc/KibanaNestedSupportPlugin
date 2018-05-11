import _ from 'lodash';
import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';
import aggregateAndSizeEditor from 'ui/agg_types/controls/top_aggregate_and_size.html';
import { uiModules } from 'ui/modules';
import { AggTypesMetricsTopHitProvider } from 'ui/agg_types/metrics/top_hit';

let app = uiModules.get('kibana/courier');

app.run(function(config, Private) {
  const TopHitType = Private(AggTypesMetricsTopHitProvider);
  TopHitType.getValue = function (agg, bucket) {
     let valueBucket = bucket;
     if (bucket['nested_' + agg.parentId]) {
         valueBucket = bucket['nested_' + agg.parentId];
     }
      const hits = _.get(valueBucket, `${agg.id}.hits.hits`);
      if (!hits || !hits.length) {
        return null;
      }
      const path = agg.params.field.name;

      let values = _(hits).map(hit => {
        return path === '_source' ? hit._source : agg.vis.indexPattern.flattenHit(hit, true)[path];
      })
      .flatten()
      .value();

      if (values.length === 1) {
        values = values[0];
      }

      if (_.isArray(values)) {
        if (!_.compact(values).length) {
          return null;
        }
        switch (agg.params.aggregate.val) {
          case 'max':
            return _.max(values);
          case 'min':
            return _.min(values);
          case 'sum':
            return _.sum(values);
          case 'average':
            return _.sum(values) / values.length;
        }
      }
      return values;
    }
  });
