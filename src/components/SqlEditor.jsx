import React, { useEffect, useRef } from "react";

export const SqlEditor = ({
  content,
  onChange,
  theme,
  monacoStatus,
  onMount,
  pendingScrollLine,
  schema,
  onToggleCommandPalette,
}) => {
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const isSettingValue = useRef(false);
  const completionProviderRef = useRef(null);
  const activeDecorationsRef = useRef([]);
  const validationTimeoutRef = useRef(null);

  const schemaRef = useRef(schema);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    schemaRef.current = schema;
    if (editorInstanceRef.current) {
      validate(editorInstanceRef.current.getModel());
    }
  }, [schema]);

  const validate = (model) => {
    if (!model || !window.monaco) return;

    const code = model.getValue();
    const markers = [];
    const currentSchema = schemaRef.current || { tables: [] };

    const tableAliasMap = {}; 
    const definedTables = new Set();

    const cleanName = (name) => name ? name.replace(/[\[\]"`]/g, "").toLowerCase() : "";
    const stripSchema = (name) => {
        const parts = name.split('.');
        return parts[parts.length - 1];
    };

    const tableRegex = /(?:\bFROM\b|\bJOIN\b|\bUPDATE\b|\bINTO\b)\s+(?:["`\[])?([a-zA-Z0-9_.]+)(?:["`\]])?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gim;
    
    let match;
    const sqlKeywords = new Set([
      "WHERE", "ON", "GROUP", "ORDER", "HAVING", "LIMIT", "SET", "VALUES", 
      "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "JOIN", "UNION", "SELECT", 
      "GO", "BEGIN", "END", "DECLARE"
    ]);

    while ((match = tableRegex.exec(code)) !== null) {
      const rawTableName = match[1];
      const rawAlias = match[2];

      if (rawTableName.startsWith("@") || rawTableName.startsWith(":") || rawTableName.startsWith("#")) continue;

      const tableNameClean = cleanName(rawTableName);
      const tableNameNoSchema = stripSchema(tableNameClean);

      const tableDef = currentSchema.tables.find(t => {
        const schemaNameClean = cleanName(t.name);
        const schemaNameNoSchema = stripSchema(schemaNameClean);
        return schemaNameClean === tableNameClean || schemaNameNoSchema === tableNameNoSchema || schemaNameClean === tableNameNoSchema || schemaNameNoSchema === tableNameClean;
      });

      if (tableDef) {
        definedTables.add(tableNameClean);
        definedTables.add(tableNameNoSchema);
        
        if (rawAlias && !sqlKeywords.has(rawAlias.toUpperCase())) {
            const aliasClean = cleanName(rawAlias);
            tableAliasMap[aliasClean] = tableDef;
        } else {
            tableAliasMap[tableNameClean] = tableDef;
            tableAliasMap[tableNameNoSchema] = tableDef;
        }
      }
    }

    const columnRegex = /\b([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\b/gm;
    
    while ((match = columnRegex.exec(code)) !== null) {
      const prefix = cleanName(match[1]);
      const colName = cleanName(match[2]);

      if (prefix === 'dbo' || prefix === 'sys') continue;

      const resolvedTable = tableAliasMap[prefix];

      if (resolvedTable) {
        const columnExists = resolvedTable.columns.some(c => cleanName(c.name) === colName);
        
        if (!columnExists && colName !== "*") {
           const startPos = match.index + match[1].length + 1;
           const endPos = startPos + match[2].length;
           
           const start = model.getPositionAt(startPos);
           const end = model.getPositionAt(endPos);

           markers.push({
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
            message: `Colonna non trovata: '${match[2]}' non esiste nella tabella '${resolvedTable.name}'.`,
            severity: window.monaco.MarkerSeverity.Warning,
          });
        }
      } 
    }

    window.monaco.editor.setModelMarkers(model, "sql", markers);
  };

  useEffect(() => {
    if (!pendingScrollLine) return;

    let attempts = 0;
    const maxAttempts = 20;

    const tryScroll = () => {
      const editor = editorInstanceRef.current;
      if (!editor || !window.monaco) {
        attempts++;
        if (attempts < maxAttempts) return false;
        return true;
      }

      editor.revealLineInCenter(pendingScrollLine);
      editor.setPosition({ lineNumber: pendingScrollLine, column: 1 });
      editor.focus();

      if (activeDecorationsRef.current.length > 0) {
        editor.deltaDecorations(activeDecorationsRef.current, []);
      }

      const newDecorations = editor.deltaDecorations(
        [],
        [
          {
            range: new window.monaco.Range(
              pendingScrollLine,
              1,
              pendingScrollLine,
              1
            ),
            options: {
              isWholeLine: true,
              className:
                theme === "dark"
                  ? "highlight-line-dark"
                  : "highlight-line-light",
              linesDecorationsClassName:
                theme === "dark"
                  ? "highlight-gutter-dark"
                  : "highlight-gutter-light",
            },
          },
        ]
      );
      activeDecorationsRef.current = newDecorations;

      setTimeout(() => {
        if (editorInstanceRef.current) {
          editorInstanceRef.current.deltaDecorations(newDecorations, []);
          activeDecorationsRef.current = [];
        }
      }, 3000);

      return true;
    };

    if (tryScroll()) return;
    const intervalId = setInterval(() => {
      if (tryScroll()) clearInterval(intervalId);
    }, 100);

    return () => clearInterval(intervalId);
  }, [pendingScrollLine, theme]);

  useEffect(() => {
    if (
      monacoStatus === "ready" &&
      window.require &&
      editorRef.current &&
      !editorInstanceRef.current
    ) {
      window.require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
        },
      });
      window.require(["vs/editor/editor.main"], function () {
        if (!editorRef.current) return;

        window.monaco.editor.defineTheme("sql-note-light", {
          base: "vs",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": "#fdfbf7",
            "editorGutter.background": "#fdfbf7",
          },
        });

        const editor = window.monaco.editor.create(editorRef.current, {
          value: content,
          language: "sql",
          theme: theme === "dark" ? "vs-dark" : "sql-note-light",
          minimap: { enabled: true, scale: 0.75, renderCharacters: false },
          fontSize: 14,
          automaticLayout: true,
          padding: { top: 20, bottom: 20 },
          fontFamily: "'Fira Code', monospace",
          fontLigatures: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
        });

        editorInstanceRef.current = editor;
        if (onMount) onMount(editor);

        editor.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyK,
          () => {
            if (onToggleCommandPalette) {
              onToggleCommandPalette();
            }
          }
        );

        editor.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyP,
          () => {
            if (onToggleCommandPalette) {
              onToggleCommandPalette();
            }
          }
        );

        const provider = window.monaco.languages.registerCompletionItemProvider(
          "sql",
          {
            triggerCharacters: [".", " "],
            provideCompletionItems: (model, position) => {
              const suggestions = [];
              const { lineNumber, column } = position;

              const word = model.getWordUntilPosition(position);
              const range = {
                startLineNumber: lineNumber,
                endLineNumber: lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              };

              const lineContent = model.getLineContent(lineNumber);
              const textUntilPosition = lineContent.substring(0, column - 1);

              if (textUntilPosition.endsWith(".")) {
                const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
                if (match) {
                  const tableName = match[1];
                  const currentSchema = schemaRef.current || { tables: [] };

                  const table = currentSchema.tables.find(
                    (t) =>
                      t.name === tableName ||
                      t.name.split(".").pop() === tableName ||
                      t.name.toLowerCase() === tableName.toLowerCase()
                  );

                  if (table) {
                    return {
                      suggestions: table.columns.map((col) => ({
                        label: col.name,
                        kind: window.monaco.languages.CompletionItemKind.Field,
                        insertText: col.name,
                        detail: `Column of ${table.name}`,
                        documentation: `Type: ${col.type}`,
                        range: range,
                      })),
                    };
                  }
                }
              }

              const addItems = (labels, kind) => {
                labels.forEach((label) => {
                  suggestions.push({
                    label,
                    kind,
                    insertText: label,
                    range: range,
                  });
                });
              };

              const currentSchema = schemaRef.current || { tables: [] };
              currentSchema.tables.forEach((table) => {
                suggestions.push({
                  label: table.name,
                  kind: window.monaco.languages.CompletionItemKind.Class,
                  insertText: table.name,
                  detail: "Table (Schema)",
                  range: range,
                });

                table.columns.forEach((col) => {
                  suggestions.push({
                    label: col.name,
                    kind: window.monaco.languages.CompletionItemKind.Field,
                    insertText: col.name,
                    detail: `Column (${table.name})`,
                    sortText: `z_${col.name}`,
                    range: range,
                  });
                });
              });

              const keywords = [
                "SELECT",
                "FROM",
                "WHERE",
                "INSERT",
                "UPDATE",
                "DELETE",
                "DROP",
                "ALTER",
                "CREATE",
                "TABLE",
                "VIEW",
                "INDEX",
                "TRIGGER",
                "PROCEDURE",
                "FUNCTION",
                "DATABASE",
                "SCHEMA",
                "GRANT",
                "REVOKE",
                "COMMIT",
                "ROLLBACK",
                "SAVEPOINT",
                "START TRANSACTION",
                "SET",
                "SHOW",
                "USE",
                "EXPLAIN",
                "DESCRIBE",
                "UNION",
                "ALL",
                "DISTINCT",
                "AS",
                "HAVING",
                "LIMIT",
                "OFFSET",
                "VALUES",
                "LEFT JOIN",
                "RIGHT JOIN",
                "INNER JOIN",
                "OUTER JOIN",
                "ON",
                "GROUP BY",
                "ORDER BY",
              ];
              addItems(
                keywords,
                window.monaco.languages.CompletionItemKind.Keyword
              );

              const modifiers = [
                "PRIMARY KEY",
                "FOREIGN KEY",
                "REFERENCES",
                "NOT NULL",
                "NULL",
                "DEFAULT",
                "UNIQUE",
                "CHECK",
                "AUTO_INCREMENT",
                "ON DELETE CASCADE",
                "ON UPDATE CASCADE",
                "UNSIGNED",
                "ZEROFILL",
              ];
              addItems(
                modifiers,
                window.monaco.languages.CompletionItemKind.Property
              );

              const dataTypes = [
                "INT",
                "INTEGER",
                "VARCHAR",
                "TEXT",
                "CHAR",
                "BOOLEAN",
                "DATE",
                "DATETIME",
                "TIMESTAMP",
                "DECIMAL",
                "FLOAT",
                "DOUBLE",
                "REAL",
                "NUMERIC",
                "BLOB",
                "JSON",
                "UUID",
                "BIGINT",
                "SMALLINT",
                "TINYINT",
                "LONGTEXT",
                "MEDIUMTEXT",
              ];
              addItems(
                dataTypes,
                window.monaco.languages.CompletionItemKind.Class
              );

              const functions = [
                "COUNT",
                "SUM",
                "AVG",
                "MIN",
                "MAX",
                "COALESCE",
                "CONCAT",
                "SUBSTRING",
                "UPPER",
                "LOWER",
                "NOW",
                "DATE_FORMAT",
                "CAST",
                "CONVERT",
                "IFNULL",
                "REPLACE",
                "TRIM",
                "LENGTH",
                "ABS",
                "ROUND",
                "CEIL",
                "FLOOR",
              ];
              addItems(
                functions,
                window.monaco.languages.CompletionItemKind.Function
              );

              const logic = [
                "AND",
                "OR",
                "NOT",
                "IN",
                "BETWEEN",
                "LIKE",
                "IS NULL",
                "IS NOT NULL",
                "EXISTS",
                "ANY",
                "ALL",
                "CASE",
                "WHEN",
                "THEN",
                "ELSE",
                "END",
              ];
              addItems(
                logic,
                window.monaco.languages.CompletionItemKind.Operator
              );

              const snippets = [
                {
                  label: "SELECT *",
                  kind: window.monaco.languages.CompletionItemKind.Snippet,
                  insertText: "SELECT * FROM ${1:table_name};",
                  insertTextRules:
                    window.monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  detail: "SELECT * FROM table",
                  documentation: "Generates a SELECT * query",
                  range: range,
                },
                {
                  label: "SELECT WHERE",
                  kind: window.monaco.languages.CompletionItemKind.Snippet,
                  insertText:
                    "SELECT * FROM ${1:table_name} WHERE ${2:condition};",
                  insertTextRules:
                    window.monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  detail: "Select with WHERE",
                  documentation: "SELECT query with WHERE clause",
                  range: range,
                },
                {
                  label: "CREATE TABLE",
                  kind: window.monaco.languages.CompletionItemKind.Snippet,
                  insertText:
                    "CREATE TABLE ${1:table_name} (\n\t${2:id} INT PRIMARY KEY AUTO_INCREMENT,\n\t${3:column_name} ${4:VARCHAR(255)} NOT NULL\n);",
                  insertTextRules:
                    window.monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  detail: "CREATE TABLE structure",
                  documentation: "Basic table creation template",
                  range: range,
                },
                {
                  label: "INSERT INTO",
                  kind: window.monaco.languages.CompletionItemKind.Snippet,
                  insertText:
                    "INSERT INTO ${1:table_name} (${2:col1}, ${3:col2}) VALUES (${4:val1}, ${5:val2});",
                  insertTextRules:
                    window.monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  detail: "INSERT INTO statement",
                  documentation: "Insert data snippet",
                  range: range,
                },
              ];

              return { suggestions: [...suggestions, ...snippets] };
            },
          }
        );
        completionProviderRef.current = provider;

        editor.onDidChangeModelContent(() => {
          if (!isSettingValue.current) {
            onChangeRef.current(editor.getValue());

            if (validationTimeoutRef.current) {
              clearTimeout(validationTimeoutRef.current);
            }
            validationTimeoutRef.current = setTimeout(() => {
              validate(editor.getModel());
            }, 500);
          }
        });

        setTimeout(() => validate(editor.getModel()), 500);
      });
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.dispose();
        editorInstanceRef.current = null;
        if (onMount) onMount(null);
      }

      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
        completionProviderRef.current = null;
      }

      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [monacoStatus]);

  useEffect(() => {
    if (editorInstanceRef.current) {
      const current = editorInstanceRef.current.getValue();
      if (content !== current) {
        isSettingValue.current = true;
        editorInstanceRef.current.setValue(content);
        isSettingValue.current = false;
        validate(editorInstanceRef.current.getModel());
      }
    }
  }, [content]);

  useEffect(() => {
    if (editorInstanceRef.current && window.monaco) {
      window.monaco.editor.setTheme(
        theme === "dark" ? "vs-dark" : "sql-note-light"
      );
    }
  }, [theme]);

  return (
    <div className="w-full h-full relative">
      <style>{`
        .monaco-editor .highlight-line-light {
          background-color: #fef08a !important;
        }
        
        .monaco-editor .highlight-line-dark {
          background-color: rgba(234, 179, 8, 0.4) !important;
        }

        .monaco-editor .highlight-gutter-light,
        .monaco-editor .highlight-gutter-dark {
          background-color: #eab308 !important;
          width: 5px !important;
          margin-left: 3px;
        }
      `}</style>

      <div
        ref={editorRef}
        className={`w-full h-full ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-[#fdfbf7]"
        }`}
      />
    </div>
  );
};