import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@principal-ade/industry-theme';
import { FileTree } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@principal-ai/alexandria-core-library';
import { GridLayoutManager, CodeCityBuilderWithGrid } from '@principal-ai/file-city-builder';
import { ArchitectureMapHighlightLayers } from './ArchitectureMapHighlightLayers';

export interface CityViewWithReactFlowProps {
  fileTree: FileTree;
  gridConfig?: CodebaseView;
  onCellClick?: (cellId: string) => void;
  cellWidth?: number;
  cellHeight?: number;
  cellSpacing?: number;
}

interface CellNodeData {
  label: string;
  fileTree: FileTree;
  fileCount: number;
  directoryCount: number;
  coordinates: [number, number];
}

const CellNode: React.FC<NodeProps<CellNodeData>> = ({ data, selected }) => {
  const { label, fileTree, fileCount, directoryCount } = data;
  const { theme } = useTheme();

  // Build city data for this cell's file tree
  const cityBuilder = useMemo(() => new CodeCityBuilderWithGrid(), []);
  const cityData = useMemo(() => {
    if (!fileTree || !fileTree.root || fileTree.root.children.length === 0) {
      return null;
    }

    try {
      const result = cityBuilder.buildCityFromFileSystem(fileTree);
      return result;
    } catch (error) {
      // Silently fail for production
      return null;
    }
  }, [fileTree, cityBuilder]);

  return (
    <div
      className="cell-node"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%)`
          : `linear-gradient(135deg, ${theme.colors.backgroundSecondary} 0%, ${theme.colors.background} 100%)`,
        borderRadius: `${theme.radii[2]}px`,
        padding: `${theme.space[3]}px`,
        width: '450px',
        height: '450px',
        border: selected ? `3px solid ${theme.colors.accent}` : `2px solid ${theme.colors.border}`,
        boxShadow: selected
          ? `0 10px 25px ${theme.colors.accent}30`
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: theme.colors.accent }} />

      {/* Header with title and stats */}
      <div
        style={{
          marginBottom: `${theme.space[2]}px`,
          paddingBottom: `${theme.space[2]}px`,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <h3
          style={{
            margin: `0 0 ${theme.space[1]}px 0`,
            fontSize: `${theme.fontSizes[2]}px`,
            fontWeight: theme.fontWeights.bold,
            fontFamily: theme.fonts.heading,
            color: theme.colors.text,
          }}
        >
          {label}
        </h3>
        <div
          style={{
            fontSize: `${theme.fontSizes[0]}px`,
            fontFamily: theme.fonts.body,
            color: theme.colors.textSecondary,
            display: 'flex',
            gap: `${theme.space[3]}px`,
          }}
        >
          <span>{fileCount} files</span>
          <span>{directoryCount} directories</span>
        </div>
      </div>

      {/* 3D City Visualization */}
      <div
        style={{
          position: 'relative',
          background: theme.colors.background,
          borderRadius: `${theme.radii[1]}px`,
          overflow: 'hidden',
          width: '350px',
          height: '350px',
        }}
      >
        {cityData ? (
          <div
            style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}
          >
            <ArchitectureMapHighlightLayers
              cityData={cityData}
              highlightLayers={[
                {
                  id: 'typescript',
                  name: 'TypeScript Files',
                  enabled: true,
                  color: theme.colors.success,
                  opacity: 0.8,
                  priority: 1,
                  items: cityData.buildings
                    .filter(b => b.path.endsWith('.ts') || b.path.endsWith('.tsx'))
                    .map(b => ({
                      path: b.path,
                      type: 'file' as const,
                      opacity: 1,
                    })),
                },
              ]}
              showGrid={false}
              showDirectoryLabels={false}
              canvasBackgroundColor={theme.colors.background}
              defaultBuildingColor={theme.colors.muted}
              defaultDirectoryColor={theme.colors.backgroundSecondary}
              className="w-full h-full"
              // Disable interactions to prevent conflicts with React Flow
              onFileClick={undefined}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: theme.colors.textMuted,
              fontSize: `${theme.fontSizes[1]}px`,
              fontFamily: theme.fonts.body,
            }}
          >
            Empty cell
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: theme.colors.accent }}
      />
    </div>
  );
};

const nodeTypes = {
  cellNode: CellNode,
};

const CityViewWithReactFlowInner: React.FC<CityViewWithReactFlowProps> = ({
  fileTree,
  gridConfig,
  onCellClick,
  cellWidth = 450,
  cellHeight = 350,
  cellSpacing = 100,
}) => {
  const { theme } = useTheme();

  const defaultGridConfig: CodebaseView = {
    id: 'default',
    version: '1.0',
    name: 'Default Grid',
    description: 'Default single-cell grid layout',
    overviewPath: 'README.md',
    category: 'default',
    displayOrder: 0,
    referenceGroups: {
      main: {
        files: ['*'],
        coordinates: [0, 0],
      },
    },
    metadata: {
      ui: {
        enabled: true,
        rows: 1,
        cols: 1,
      },
    },
  };

  const config = gridConfig || defaultGridConfig;

  const { nodes, edges } = useMemo(() => {
    const gridManager = new GridLayoutManager();
    const { rows, cols } = gridManager.getGridDimensions(config);

    const gridTrees = gridManager.splitTreeIntoGrid(fileTree, config);

    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    // Create cell nodes
    gridTrees.forEach((cellTree: FileTree, cellKey: string) => {
      const [row, col] = cellKey.split(',').map(Number);

      // Find cell name from config
      let cellName = 'Cell';
      for (const [name, cellConfig] of Object.entries(config.referenceGroups)) {
        if (cellConfig.coordinates[0] === row && cellConfig.coordinates[1] === col) {
          cellName = name;
          break;
        }
      }

      const cellNode: Node<CellNodeData> = {
        id: `cell-${row}-${col}`,
        type: 'cellNode',
        position: {
          x: col * (cellWidth + cellSpacing),
          y: row * (cellHeight + cellSpacing),
        },
        data: {
          label: cellName,
          fileTree: cellTree,
          fileCount: cellTree.stats.totalFiles,
          directoryCount: cellTree.stats.totalDirectories,
          coordinates: [row, col],
        },
      };

      generatedNodes.push(cellNode);
    });

    // Create subtle grid connections (optional)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Only add edges if both nodes exist (non-empty cells)
        const currentNode = generatedNodes.find(n => n.id === `cell-${row}-${col}`);
        if (!currentNode) continue;

        // Horizontal connections
        if (col < cols - 1) {
          const rightNode = generatedNodes.find(n => n.id === `cell-${row}-${col + 1}`);
          if (rightNode) {
            generatedEdges.push({
              id: `edge-${row}-${col}-to-${row}-${col + 1}`,
              source: `cell-${row}-${col}`,
              target: `cell-${row}-${col + 1}`,
              type: 'straight',
              animated: false,
              style: {
                stroke: `${theme.colors.border}40`,
                strokeWidth: 1,
                strokeDasharray: '5 10',
              },
            });
          }
        }

        // Vertical connections
        if (row < rows - 1) {
          const bottomNode = generatedNodes.find(n => n.id === `cell-${row + 1}-${col}`);
          if (bottomNode) {
            generatedEdges.push({
              id: `edge-${row}-${col}-to-${row + 1}-${col}`,
              source: `cell-${row}-${col}`,
              target: `cell-${row + 1}-${col}`,
              type: 'straight',
              animated: false,
              style: {
                stroke: `${theme.colors.border}40`,
                strokeWidth: 1,
                strokeDasharray: '5 10',
              },
            });
          }
        }
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [fileTree, config, cellWidth, cellHeight, cellSpacing, theme]);

  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, , onEdgesChange] = useEdgesState(edges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'cellNode' && onCellClick) {
        onCellClick(node.id);
      }
    },
    [onCellClick],
  );

  return (
    <div style={{ width: '100%', height: '100%', background: theme.colors.background }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={30}
            size={1}
            color={`${theme.colors.border}40`}
          />
          <Controls />
          <MiniMap
            nodeColor={() => theme.colors.primary}
            style={{
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export const CityViewWithReactFlow = CityViewWithReactFlowInner;
