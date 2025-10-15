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
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FileTree } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';
import { GridLayoutManager, CodeCityBuilderWithGrid } from '@principal-ai/code-city-builder';
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
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
        borderRadius: '12px',
        padding: '12px',
        width: '450px',
        height: '450px',
        border: selected ? '3px solid #764ba2' : '2px solid #4a5568',
        boxShadow: selected
          ? '0 10px 25px rgba(118, 75, 162, 0.3)'
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#764ba2' }} />

      {/* Header with title and stats */}
      <div style={{
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <h3 style={{
          margin: '0 0 4px 0',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          {label}
        </h3>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          gap: '12px'
        }}>
          <span>📄 {fileCount} files</span>
          <span>📁 {directoryCount} directories</span>
        </div>
      </div>

      {/* 3D City Visualization */}
      <div style={{
        position: 'relative',
        background: '#1a1a1a',
        borderRadius: '8px',
        overflow: 'hidden',
        width: '350px',
        height: '350px',
      }}>
        {cityData ? (
          <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
            <ArchitectureMapHighlightLayers
              cityData={cityData}
              highlightLayers={[
                {
                  id: 'typescript',
                  name: 'TypeScript Files',
                  enabled: true,
                  color: '#00ff00',
                  opacity: 0.8,
                  priority: 1,
                  items: cityData.buildings
                    .filter(b => b.path.endsWith('.ts') || b.path.endsWith('.tsx'))
                    .map(b => ({
                      path: b.path,
                      type: 'file' as const,
                      opacity: 1
                    }))
                }
              ]}
              showGrid={false}
              showLegend={false}
              showDirectoryLabels={false}
              canvasBackgroundColor="#1a1a1a"
              defaultBuildingColor="#4a5568"
              defaultDirectoryColor="#2d3748"
              className="w-full h-full"
              // Disable interactions to prevent conflicts with React Flow
              onFileClick={undefined}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px',
          }}>
            Empty cell
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#764ba2' }} />
    </div>
  );
};

const nodeTypes = {
  cellNode: CellNode,
};

export const CityViewWithReactFlow: React.FC<CityViewWithReactFlowProps> = ({
  fileTree,
  gridConfig,
  onCellClick,
  cellWidth = 450,
  cellHeight = 350,
  cellSpacing = 100,
}) => {
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
          y: row * (cellHeight + cellSpacing)
        },
        data: {
          label: cellName,
          fileTree: cellTree,
          fileCount: cellTree.stats.totalFiles,
          directoryCount: cellTree.stats.totalDirectories,
          coordinates: [row, col]
        }
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
                stroke: 'rgba(100, 100, 100, 0.2)',
                strokeWidth: 1,
                strokeDasharray: '5 10'
              }
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
                stroke: 'rgba(100, 100, 100, 0.2)',
                strokeWidth: 1,
                strokeDasharray: '5 10'
              }
            });
          }
        }
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [fileTree, config, cellWidth, cellHeight, cellSpacing]);

  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, , onEdgesChange] = useEdgesState(edges);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'cellNode' && onCellClick) {
      onCellClick(node.id);
    }
  }, [onCellClick]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }}>
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
            color="rgba(100, 100, 100, 0.2)"
          />
          <Controls />
          <MiniMap
            nodeColor={() => '#667eea'}
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4a5568',
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};