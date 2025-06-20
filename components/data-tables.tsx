"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Table,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Edit,
  Upload,
  FileText,
  Download,
} from "lucide-react";

interface Cell {
  value: string;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    fontStyle?: string;
  };
}

interface DataEntry {
  id: string;
  title: string;
  content: string;
  color: string;
  attachments: { id: string; name: string; url: string; type: string }[];
  createdAt: string;
  updatedAt: string;
}

interface DataCollection {
  id: string;
  name: string;
  color: string;
  entries: DataEntry[];
}

interface Sheet {
  id: string;
  name: string;
  columns: string[];
  data: Cell[][];
}

interface TableData {
  id: string;
  name: string;
  color: string;
  sheets: Sheet[];
  activeSheet: string;
}

interface ColorType {
  name: string;
  value: string;
}

const collectionColors: ColorType[] = [
  { name: "Electric Blue", value: "#0066FF" },
  { name: "Electric Green", value: "#00FF66" },
  { name: "Electric Orange", value: "#FF6600" },
  { name: "Electric Purple", value: "#6600FF" },
  { name: "Electric Red", value: "#FF0066" },
];

const cellColors: ColorType[] = [
  { name: "Blue", value: "#0066FF" },
  { name: "Green", value: "#00FF66" },
  { name: "Orange", value: "#FF6600" },
  { name: "Purple", value: "#6600FF" },
  { name: "Red", value: "#FF0066" },
];

export function DataTables() {
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTable, setActiveTable] = useState<string>("");
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [selectedColor, setSelectedColor] = useState(collectionColors[0].value);
  const [editingEntry, setEditingEntry] = useState<{ collectionId: string; entry: DataEntry | null }>({
    collectionId: "",
    entry: null,
  });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedCollections = localStorage.getItem("dataCollections");
    if (savedCollections) {
      const parsedCollections = JSON.parse(savedCollections);
      const collectionsWithAttachments = parsedCollections.map((col: any) => ({
        ...col,
        entries: col.entries.map((entry: any) => ({
          ...entry,
          attachments: entry.attachments || [],
        })),
      }));
      setCollections(collectionsWithAttachments);
    }
    const savedTables = localStorage.getItem("dataTables");
    if (savedTables) {
      const parsedTables = JSON.parse(savedTables);
      setTables(parsedTables);
      if (parsedTables.length > 0) {
        setActiveTable(parsedTables[0].id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dataCollections", JSON.stringify(collections));
    localStorage.setItem("dataTables", JSON.stringify(tables));
  }, [collections, tables]);

  const createEmptySheet = (name: string): Sheet => ({
    id: Date.now().toString(),
    name,
    columns: Array.from({ length: 10 }, (_: unknown, i: number) => `Column ${i + 1}`),
    data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => ({ value: "" } as Cell))),
  });

  const addCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection: DataCollection = {
        id: Date.now().toString(),
        name: newCollectionName.trim(),
        color: selectedColor,
        entries: [],
      };
      setCollections([...collections, newCollection]);
      setNewCollectionName("");
      setIsAddingCollection(false);
    }
  };

  const addTable = () => {
    if (newTableName.trim()) {
      const newTable: TableData = {
        id: Date.now().toString(),
        name: newTableName.trim(),
        color: selectedColor,
        sheets: [createEmptySheet("Sheet 1")],
        activeSheet: "",
      };
      newTable.activeSheet = newTable.sheets[0].id;
      setTables([...tables, newTable]);
      setActiveTable(newTable.id);
      setNewTableName("");
      setIsAddingTable(false);
    }
  };

  const deleteCollection = (collectionId: string) => {
    setCollections(collections.filter((collection) => collection.id !== collectionId));
  };

  const deleteTable = (tableId: string) => {
    setTables(tables.filter((table) => table.id !== tableId));
    if (activeTable === tableId) {
      const remainingTables = tables.filter((table) => table.id !== tableId);
      setActiveTable(remainingTables[0]?.id || "");
    }
  };

  const openEntryDialog = (collectionId: string, entry?: DataEntry) => {
    setEditingEntry({
      collectionId,
      entry: entry || {
        id: "",
        title: "",
        content: "",
        color: collectionColors[0].value,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    setIsEntryDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editingEntry.entry) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment = {
          id: Date.now().toString(),
          name: file.name,
          url: e.target?.result as string,
          type: file.type,
        };
        setEditingEntry({
          ...editingEntry,
          entry: {
            ...editingEntry.entry!,
            attachments: [...editingEntry.entry!.attachments, attachment],
          },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteAttachment = (attachmentId: string) => {
    if (!editingEntry.entry) return;
    setEditingEntry({
      ...editingEntry,
      entry: {
        ...editingEntry.entry,
        attachments: editingEntry.entry.attachments.filter((att) => att.id !== attachmentId),
      },
    });
  };

  const downloadAttachment = (attachment: { name: string; url: string }) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  };

  const saveEntry = () => {
    if (!editingEntry.entry || !editingEntry.entry.title.trim()) return;
    setCollections(
      collections.map((collection) => {
        if (collection.id === editingEntry.collectionId) {
          if (editingEntry.entry!.id) {
            return {
              ...collection,
              entries: collection.entries.map((entry) =>
                entry.id === editingEntry.entry!.id
                  ? { ...editingEntry.entry!, updatedAt: new Date().toISOString() }
                  : entry,
              ),
            };
          } else {
            return {
              ...collection,
              entries: [
                ...collection.entries,
                {
                  ...editingEntry.entry!,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            };
          }
        }
        return collection;
      }),
    );
    setIsEntryDialogOpen(false);
    setEditingEntry({ collectionId: "", entry: null });
  };

  const deleteEntry = (collectionId: string, entryId: string) => {
    setCollections(
      collections.map((collection) => {
        if (collection.id === collectionId) {
          return {
            ...collection,
            entries: collection.entries.filter((entry) => entry.id !== entryId),
          };
        }
        return collection;
      }),
    );
  };

  const updateCell = (row: number, col: number, value: string) => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newData = [...sheet.data] as Cell[][];
                newData[row] = [...newData[row]];
                newData[row][col] = { ...newData[row][col], value };
                return { ...sheet, data: newData };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const updateColumnHeader = (col: number, value: string) => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newColumns = [...sheet.columns];
                newColumns[col] = value;
                return { ...sheet, columns: newColumns };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const formatSelectedCells = (style: Partial<Cell["style"]>) => {
    if (!activeTable || selectedCells.length === 0) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newData = [...sheet.data] as Cell[][];
                selectedCells.forEach(({ row, col }) => {
                  newData[row] = [...newData[row]];
                  newData[row][col] = {
                    ...newData[row][col],
                    style: { ...newData[row][col].style, ...style },
                  };
                });
                return { ...sheet, data: newData };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const addRow = () => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newRow = Array.from({ length: sheet.columns.length }, (_: unknown, i: number) => ({
                  value: "",
                } as Cell));
                return { ...sheet, data: [...sheet.data, newRow] };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const addColumn = () => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newColumns = [...sheet.columns, `Column ${sheet.columns.length + 1}`];
                const newData = sheet.data.map((row: Cell[]) => [...row, { value: "" } as Cell]);
                return { ...sheet, columns: newColumns, data: newData };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const deleteColumn = (colIndex: number) => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newColumns = sheet.columns.filter((_: string, i: number) => i !== colIndex);
                const newData = sheet.data.map((row: Cell[]) => row.filter((_: Cell, i: number) => i !== colIndex));
                return { ...sheet, columns: newColumns, data: newData };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const deleteRow = (rowIndex: number) => {
    if (!activeTable) return;
    setTables(
      tables.map((table: TableData) => {
        if (table.id === activeTable) {
          return {
            ...table,
            sheets: table.sheets.map((sheet: Sheet) => {
              if (sheet.id === table.activeSheet) {
                const newData = sheet.data.filter((_: Cell[], i: number) => i !== rowIndex);
                return { ...sheet, data: newData };
              }
              return sheet;
            }),
          };
        }
        return table;
      }),
    );
  };

  const getCurrentTable = () => tables.find((table) => table.id === activeTable);
  const getCurrentSheet = () => {
    const table = getCurrentTable();
    return table?.sheets.find((sheet) => sheet.id === table.activeSheet);
  };

  const currentTable = getCurrentTable();
  const currentSheet = getCurrentSheet();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Data Collections</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddingCollection(true)} className="bg-slate-800 hover:bg-slate-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
          <Button onClick={() => setIsAddingTable(true)} className="bg-slate-700 hover:bg-slate-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Table
          </Button>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="bg-gradient-to-br from-white to-gray-50 border-2"
            style={{ borderColor: collection.color + "40" }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2" style={{ color: collection.color }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: collection.color }} />
                  {collection.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEntryDialog(collection.id)}
                    className="text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCollection(collection.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {collection.entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="p-3 border"
                  style={{ borderColor: entry.color + "40", backgroundColor: entry.color + "10" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1" style={{ color: entry.color }}>
                        {entry.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-3">{entry.content}</p>
                      {entry.attachments.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-500">{entry.attachments.length} file(s)</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{new Date(entry.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEntryDialog(collection.id, entry)}
                        className="h-6 w-6 p-0 text-slate-600 hover:bg-slate-100"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry(collection.id, entry.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {collection.entries.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No entries yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables Section */}
      {tables.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Spreadsheet Tables</h3>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {tables.map((table) => (
              <Button
                key={table.id}
                variant={activeTable === table.id ? "default" : "outline"}
                onClick={() => setActiveTable(table.id)}
                className={`${
                  activeTable === table.id
                    ? "bg-slate-800 text-white"
                    : "border-slate-400 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: table.color }} />
                {table.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTable(table.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Button>
            ))}
          </div>

          {currentTable && (
            <div>
              {/* Formatting Toolbar */}
              {currentSheet && selectedCells.length > 0 && (
                <Card className="bg-slate-100 border-slate-300 mb-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => formatSelectedCells({ fontWeight: "bold" })}>
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => formatSelectedCells({ fontStyle: "italic" })}>
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => formatSelectedCells({ textAlign: "left" })}>
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => formatSelectedCells({ textAlign: "center" })}>
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => formatSelectedCells({ textAlign: "right" })}>
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-6 bg-slate-400 mx-2" />
                      {cellColors.map((color) => (
                        <Button
                          key={color.name}
                          variant="outline"
                          size="sm"
                          onClick={() => formatSelectedCells({ backgroundColor: color.value })}
                          className="w-8 h-8 p-0 border-2"
                          style={{ backgroundColor: color.value, borderColor: color.value }}
                          title={`Background: ${color.name}`}
                        />
                      ))}
                      <div className="w-px h-6 bg-slate-400 mx-2" />
                      {cellColors.map((color) => (
                        <Button
                          key={`text-${color.name}`}
                          variant="outline"
                          size="sm"
                          onClick={() => formatSelectedCells({ color: color.value })}
                          className="w-8 h-8 p-0 border-2 border-slate-300"
                          title={`Text: ${color.name}`}
                        >
                          <span style={{ color: color.value }}>A</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Table Controls */}
              <div className="flex gap-2 mb-4">
                <Button size="sm" onClick={addColumn} className="bg-slate-700 hover:bg-slate-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
                <Button size="sm" onClick={addRow} className="bg-slate-600 hover:bg-slate-500 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </div>

              {/* Spreadsheet */}
              <Card className="bg-white border-2 border-slate-300">
                <CardHeader>
                  <CardTitle className="text-slate-800">{currentTable.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[600px] border border-slate-300 rounded-lg">
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr>
                          <th className="w-12 h-10 border border-slate-300 bg-slate-100 text-xs font-bold text-slate-800 sticky top-0">
                            #
                          </th>
                          {currentSheet?.columns.map((column: string, colIndex: number) => (
                            <th
                              key={colIndex}
                              className="min-w-[120px] h-10 border border-slate-300 bg-slate-100 relative group sticky top-0"
                            >
                              <Input
                                value={column}
                                onChange={(e) => updateColumnHeader(colIndex, e.target.value)}
                                className="border-0 bg-transparent text-xs font-bold text-center h-8 text-slate-800"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-600 hover:bg-red-50"
                                onClick={() => deleteColumn(colIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentSheet?.data.map((row: Cell[], rowIndex: number) => (
                          <tr key={rowIndex} className="group hover:bg-slate-50">
                            <td className="w-12 h-10 border border-slate-300 bg-slate-50 text-xs text-center font-bold text-slate-800 relative">
                              {rowIndex + 1}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-600 hover:bg-red-50"
                                onClick={() => deleteRow(rowIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                            {row.map((cell: Cell, colIndex: number) => (
                              <td
                                key={colIndex}
                                className={`border border-slate-300 p-0 relative cursor-pointer ${
                                  selectedCells.some((c) => c.row === rowIndex && c.col === colIndex)
                                    ? "ring-2 ring-slate-500 bg-slate-100"
                                    : ""
                                }`}
                                style={{
                                  backgroundColor: cell.style?.backgroundColor,
                                  color: cell.style?.color || "#1e293b",
                                }}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    setSelectedCells((prev) => {
                                      const exists = prev.some((c) => c.row === rowIndex && c.col === colIndex);
                                      if (exists) {
                                        return prev.filter((c) => !(c.row === rowIndex && c.col === colIndex));
                                      } else {
                                        return [...prev, { row: rowIndex, col: colIndex }];
                                      }
                                    });
                                  } else {
                                    setSelectedCells([{ row: rowIndex, col: colIndex }]);
                                  }
                                }}
                              >
                                {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                  <Input
                                    value={cellValue}
                                    onChange={(e) => setCellValue(e.target.value)}
                                    onBlur={() => {
                                      updateCell(rowIndex, colIndex, cellValue);
                                      setEditingCell(null);
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        updateCell(rowIndex, colIndex, cellValue);
                                        setEditingCell(null);
                                      }
                                    }}
                                    className="border-0 h-10 text-xs bg-transparent"
                                    autoFocus
                                  />
                                ) : (
                                  <div
                                    className="h-10 px-3 flex items-center cursor-pointer hover:bg-slate-50"
                                    style={{
                                      fontWeight: cell.style?.fontWeight,
                                      textAlign: cell.style?.textAlign,
                                      fontStyle: cell.style?.fontStyle,
                                    }}
                                    onDoubleClick={() => {
                                      setEditingCell({ row: rowIndex, col: colIndex });
                                      setCellValue(cell.value);
                                    }}
                                  >
                                    <span className="text-xs truncate">{cell.value}</span>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {collections.length === 0 && tables.length === 0 && (
        <Card className="bg-slate-100 border-2 border-slate-300">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Table className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-gray-600">
                No collections or tables yet. Create your first collection or table to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Collection Dialog */}
      <Dialog open={isAddingCollection} onOpenChange={setIsAddingCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-800">Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Collection Name</label>
              <Input
                placeholder="Enter collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCollection()}
                className="border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Collection Color</label>
              <div className="flex gap-2">
                {collectionColors.map((color: ColorType) => (
                  <button
                    key={color.name}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color.value ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addCollection} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white">
                Create Collection
              </Button>
              <Button variant="outline" onClick={() => setIsAddingCollection(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-700">Create New Spreadsheet Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Table Name</label>
              <Input
                placeholder="Enter table name..."
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTable()}
                className="border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Table Color</label>
              <div className="flex gap-2">
                {collectionColors.map((color: ColorType) => (
                  <button
                    key={color.name}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color.value ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addTable} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white">
                Create Table
              </Button>
              <Button variant="outline" onClick={() => setIsAddingTable(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {editingEntry.entry?.id ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
          </DialogHeader>
          {editingEntry.entry && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Title</label>
                <Input
                  value={editingEntry.entry.title}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      entry: { ...editingEntry.entry!, title: e.target.value },
                    })
                  }
                  placeholder="Entry title..."
                  className="border-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Content</label>
                <Textarea
                  value={editingEntry.entry.content}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      entry: { ...editingEntry.entry!, content: e.target.value },
                    })
                  }
                  placeholder="Entry content..."
                  rows={6}
                  className="border-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Color</label>
                <div className="flex gap-2">
                  {collectionColors.map((color: ColorType) => (
                    <button
                      key={color.name}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingEntry.entry!.color === color.value ? "border-gray-800" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() =>
                        setEditingEntry({
                          ...editingEntry,
                          entry: { ...editingEntry.entry!, color: color.value },
                        })
                      }
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Attachments</label>
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="*/*" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Attach File
                    </Button>
                  </div>
                </div>
                {editingEntry.entry.attachments.length > 0 && (
                  <div className="space-y-2">
                    {editingEntry.entry.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 bg-muted p-2 rounded-lg text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="truncate flex-1">{attachment.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachment(attachment.id)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEntry} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white">
                  {editingEntry.entry.id ? "Update" : "Add"} Entry
                </Button>
                <Button variant="outline" onClick={() => setIsEntryDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}