import Supercluster from 'supercluster';

import type { Fixture } from '@/types/fixture';
import type { Bounds } from './filterFixtures';

export type MapItem =
  | { type: 'fixture'; fixture: Fixture }
  | {
      type: 'cluster';
      key: string;
      latitude: number;
      longitude: number;
      count: number;
      fixtureIds: string[];
      /** Zoom level at which this cluster splits; above MAX_SPLIT_ZOOM the games share a venue. */
      expansionZoom: number;
    };

export const MAX_SPLIT_ZOOM = 16;

export type ClusterIndex = Supercluster<{ id: string }>;

export function buildClusterIndex(fixtures: Fixture[]): ClusterIndex {
  const index = new Supercluster<{ id: string }>({ radius: 48, maxZoom: 20 });
  index.load(
    fixtures.map((f) => ({
      type: 'Feature' as const,
      properties: { id: f.id },
      geometry: { type: 'Point' as const, coordinates: [f.longitude, f.latitude] },
    }))
  );
  return index;
}

export function getMapItems(index: ClusterIndex, fixtures: Fixture[], bounds: Bounds, zoom: number): MapItem[] {
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  return index
    .getClusters([bounds.west, bounds.south, bounds.east, bounds.north], Math.round(zoom))
    .flatMap((c): MapItem[] => {
      const [longitude, latitude] = c.geometry.coordinates;
      const props = c.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string };
      if (props.cluster && props.cluster_id != null) {
        return [
          {
            type: 'cluster',
            key: `c${props.cluster_id}`,
            latitude,
            longitude,
            count: props.point_count ?? 0,
            fixtureIds: index.getLeaves(props.cluster_id, Infinity).map((l) => l.properties.id),
            expansionZoom: index.getClusterExpansionZoom(props.cluster_id),
          },
        ];
      }
      const fixture = props.id ? byId.get(props.id) : undefined;
      return fixture ? [{ type: 'fixture', fixture }] : [];
    });
}

export const WORLD: Bounds = { north: 85, south: -85, east: 180, west: -180 };
