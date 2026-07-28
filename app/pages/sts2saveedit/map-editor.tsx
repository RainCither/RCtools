import { useMemo, useState } from "react";
import { isEditableMapNodeType, MapNodeIcon } from "./icons";
import { EDITABLE_MAP_NODE_TYPES, getCurrentMap } from "./save-core";
import styles from "./styles.module.css";
import type { MapNodeType, Sts2MapCoord, Sts2MapNode, Sts2Save } from "./types";

const NODE_LABELS: Record<string, string> = {
  ancient: "远古起点",
  boss: "Boss",
  elite: "精英",
  monster: "普通敌人",
  rest_site: "休息处",
  shop: "商店",
  treasure: "宝箱",
  unknown: "未知",
};

function coordKey(coord: Sts2MapCoord) {
  return `${coord.col}:${coord.row}`;
}

function edgeKey(from: Sts2MapCoord, to: Sts2MapCoord) {
  return `${coordKey(from)}>${coordKey(to)}`;
}

function isMapCoord(value: unknown): value is Sts2MapCoord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const coord = value as Partial<Sts2MapCoord>;
  return Number.isSafeInteger(coord.col) && Number.isSafeInteger(coord.row);
}

export default function MapEditor({
  onNodeTypeChange,
  save,
}: {
  onNodeTypeChange: (col: number, row: number, type: MapNodeType) => void;
  save: Sts2Save;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const map = getCurrentMap(save);
  const nodes = useMemo(() => [map.start, ...map.points, map.boss], [map]);
  const nodeByKey = useMemo(
    () => new Map(nodes.map((node) => [coordKey(node.coord), node])),
    [nodes],
  );
  const visitedCoords = useMemo(
    () =>
      Array.isArray(save.visited_map_coords)
        ? save.visited_map_coords.filter(isMapCoord)
        : [],
    [save.visited_map_coords],
  );
  const visitedKeys = useMemo(
    () => new Set(visitedCoords.map(coordKey)),
    [visitedCoords],
  );
  const visitedEdges = useMemo(() => {
    const edges = new Set<string>();

    for (let index = 1; index < visitedCoords.length; index += 1) {
      edges.add(edgeKey(visitedCoords[index - 1], visitedCoords[index]));
    }

    return edges;
  }, [visitedCoords]);
  const currentKey =
    visitedCoords.length > 0
      ? coordKey(visitedCoords[visitedCoords.length - 1])
      : null;
  const selected = selectedKey ? (nodeByKey.get(selectedKey) ?? null) : null;
  const selectedEditable = selected
    ? map.points.some((point) => coordKey(point.coord) === selectedKey)
    : false;

  function position(coord: Sts2MapCoord) {
    return {
      left: `${((coord.col + 0.5) / map.width) * 100}%`,
      top: `${((map.height - coord.row + 0.5) / (map.height + 1)) * 100}%`,
    };
  }

  return (
    <section aria-labelledby="map-editor-title" className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>ACT MAP MATRIX</span>
          <h1 id="map-editor-title">地图修改</h1>
          <p>
            仅切换普通节点类型。坐标、连线、地图尺寸、起点、Boss 与访问历史
            均保持不变。
          </p>
        </div>
        <span className={styles.sectionBadge}>
          当前地图 · {map.width} × {map.height}
        </span>
      </header>

      <div className={styles.mapLayout}>
        <div className={styles.mapScroll}>
          <div
            aria-label="当前地图"
            className={styles.mapCanvas}
            style={
              {
                "--map-columns": map.width,
                "--map-rows": map.height + 1,
              } as React.CSSProperties
            }
          >
            <svg
              aria-hidden="true"
              className={styles.mapConnections}
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {nodes.flatMap((node) =>
                (node.children ?? []).map((child) => {
                  const start = position(node.coord);
                  const end = position(child);
                  const x1 = Number.parseFloat(start.left);
                  const y1 = Number.parseFloat(start.top);
                  const x2 = Number.parseFloat(end.left);
                  const y2 = Number.parseFloat(end.top);
                  const isVisitedEdge = visitedEdges.has(
                    edgeKey(node.coord, child),
                  );

                  return (
                    <line
                      className={
                        isVisitedEdge ? styles.mapConnectionVisited : undefined
                      }
                      key={`${coordKey(node.coord)}-${coordKey(child)}`}
                      x1={x1}
                      x2={x2}
                      y1={y1}
                      y2={y2}
                    />
                  );
                }),
              )}
            </svg>

            {nodes.map((node) => {
              const key = coordKey(node.coord);
              const editable = map.points.includes(node);
              const selectedNode = selectedKey === key;
              const visited = visitedKeys.has(key);
              const current = currentKey === key;

              return (
                <button
                  aria-label={`${NODE_LABELS[node.type] ?? node.type}，坐标 ${node.coord.col}, ${node.coord.row}${
                    editable ? "，可修改" : "，已锁定"
                  }${visited ? "，已访问" : ""}${current ? "，当前位置" : ""}`}
                  aria-pressed={selectedNode}
                  className={`${styles.mapNode} ${
                    selectedNode ? styles.mapNodeSelected : ""
                  } ${visited ? styles.mapNodeVisited : ""} ${
                    current ? styles.mapNodeCurrent : ""
                  } ${editable ? "" : styles.mapNodeLocked}`}
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  style={{
                    gridColumn: node.coord.col + 1,
                    gridRow: map.height - node.coord.row + 1,
                  }}
                  type="button"
                >
                  <MapNodeIcon type={node.type} />
                  <span>{node.coord.row}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.mapInspector}>
          <span className={styles.eyebrow}>NODE INSPECTOR</span>
          <div aria-label="地图状态图例" className={styles.mapLegend}>
            <span>
              <i className={styles.mapLegendCurrent} />
              当前位置
            </span>
            <span>
              <i className={styles.mapLegendVisited} />
              已访问
            </span>
            <span>
              <i className={styles.mapLegendDefault} />
              未访问
            </span>
          </div>
          {selected ? (
            <>
              <div className={styles.selectedNodeTitle}>
                <MapNodeIcon type={selected.type} />
                <div>
                  <strong>{NODE_LABELS[selected.type] ?? selected.type}</strong>
                  <code>
                    COL {selected.coord.col} · ROW {selected.coord.row}
                  </code>
                </div>
              </div>
              {selectedEditable ? (
                <div className={styles.nodeTypeList}>
                  {EDITABLE_MAP_NODE_TYPES.map((type) => (
                    <button
                      aria-pressed={selected.type === type}
                      className={
                        selected.type === type ? styles.nodeTypeActive : ""
                      }
                      key={type}
                      onClick={() => {
                        if (isEditableMapNodeType(type)) {
                          onNodeTypeChange(
                            selected.coord.col,
                            selected.coord.row,
                            type,
                          );
                        }
                      }}
                      type="button"
                    >
                      <MapNodeIcon type={type} />
                      <span>{NODE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.lockedMessage}>
                  这是锁定节点，只展示原始数据，不能修改。
                </p>
              )}
              <dl className={styles.nodeDetails}>
                <div>
                  <dt>访问状态</dt>
                  <dd>
                    {currentKey === coordKey(selected.coord)
                      ? "当前位置"
                      : visitedKeys.has(coordKey(selected.coord))
                        ? "已访问"
                        : "未访问"}
                  </dd>
                </div>
                <div>
                  <dt>子节点</dt>
                  <dd>{selected.children?.length ?? 0}</dd>
                </div>
                <div>
                  <dt>原始类型</dt>
                  <dd>{selected.type}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className={styles.mapHint}>
              选择地图上的节点后，可在这里查看坐标并切换类型。
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
