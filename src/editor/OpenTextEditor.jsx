import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  Undo, Redo, Bold, Italic, Underline, Strikethrough, Code, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, 
  Indent, Outdent, RemoveFormatting, ChevronDown, X,
  List, ListOrdered, Quote, Minus, Type, Highlighter,
  Superscript, Subscript, Trash2, Maximize2,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoreHorizontal,
  GripVertical, FileCode
} from 'lucide-react';

const DEFAULT_INITIAL_CONTENT = "";

const OpenTextEditor = forwardRef(({ 
  initialValue = DEFAULT_INITIAL_CONTENT, 
  onChange, 
  className = "w-full h-full",
  placeholder = "Start typing..."
}, ref) => {
  const editorRef = useRef(null);
  const sourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const textColorRef = useRef(null);
  const bgColorRef = useRef(null);
  const savedSelection = useRef(null); // Track last valid selection in editor

  const [activeFormats, setActiveFormats] = useState({});
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [headingLabel, setHeadingLabel] = useState('Normal');
  const [fontLabel, setFontLabel] = useState('Sans Serif');
  const [fontSizeLabel, setFontSizeLabel] = useState('16px');
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // --- Source View State ---
  const [isSourceMode, setIsSourceMode] = useState(false);
  // Initialize sourceContent with initialValue to prevent empty restore on first toggle
  const [sourceContent, setSourceContent] = useState(initialValue || "");

  // --- Selection & Resizing State ---
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeCell, setActiveCell] = useState(null); 
  const [overlayStyle, setOverlayStyle] = useState(null);
  
  // Array to store position/info for all column resize handles
  const [colResizers, setColResizers] = useState([]); 
  
  const [isResizing, setIsResizing] = useState(false);
  const [isColResizing, setIsColResizing] = useState(false);
  
  const resizeRef = useRef({ startX: 0, startWidth: 0, target: null });
  const colResizeRef = useRef({ startX: 0, startWidth: 0, target: null });

  // --- External API (Plugins) ---
  const restoreSelection = () => {
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    } else {
      editorRef.current?.focus(); 
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getHtml: () => editorRef.current?.innerHTML || "",
    setHtml: (html) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        setSourceContent(html);
        handleInput(); // Update empty state
      }
    },
    insertHtml: (html) => {
      restoreSelection();
      execCommand('insertHTML', html);
    },
    execCommand: (command, value) => {
      restoreSelection();
      execCommand(command, value);
    },
    insertTable: (rows, cols) => {
      // Allows external app to trigger insert table with specific dims
      insertTable(rows, cols);
    },
    tableAction: (action) => {
      // Allows external app to modify table structure (add col/row)
      // Note: Requires activeCell to be set (user clicked inside table)
      restoreSelection();
      tableAction(action);
    }
  }));

  // --- Initialization & Prop Updates ---
  
  useEffect(() => {
    // Handle initial load and subsequent prop updates for HTML content
    if (editorRef.current && !isSourceMode) {
      if (initialValue && initialValue !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = initialValue;
        setSourceContent(initialValue); // Sync source content as well
        setIsEmpty(false);
      } else if (!initialValue && !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = '<p><br/></p>';
        setSourceContent('<p><br/></p>');
        setIsEmpty(true);
      }
    }
  }, [initialValue, isSourceMode]);

  // --- Editor Command Handlers ---

  const handleInput = () => {
    checkActiveFormats();
    updateOverlay();
    
    if (editorRef.current) {
      const text = editorRef.current.textContent;
      setIsEmpty(!text || text.trim() === '');
      
      if (onChange) {
        onChange(editorRef.current.innerHTML);
      }
    }
  };

  // Handle Source View Input
  const handleSourceInput = (e) => {
    const newHtml = e.target.value;
    setSourceContent(newHtml);
    if (onChange) {
      onChange(newHtml);
    }
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switch TO Visual Mode
      setIsSourceMode(false);
    } else {
      // Switch TO Source Mode
      if (editorRef.current) {
        setSourceContent(editorRef.current.innerHTML);
        
        // Clear selection overlays
        setSelectedNode(null);
        setOverlayStyle(null);
        setActiveCell(null);
        setColResizers([]);
      }
      setIsSourceMode(true);
    }
  };

  // Restore content when switching back to Visual Mode
  useEffect(() => {
    if (!isSourceMode && editorRef.current) {
      if (editorRef.current.innerHTML !== sourceContent) {
        editorRef.current.innerHTML = sourceContent || '<p><br/></p>';
        handleInput();
      }
    }
  }, [isSourceMode]);

  const execCommand = (command, value = null) => {
    if (isSourceMode) return; 
    document.execCommand(command, false, value);
    handleInput(); 
    editorRef.current?.focus();
  };

  const handleHeading = (tag, label) => {
    execCommand('formatBlock', tag);
    setHeadingLabel(label);
    setShowHeadingDropdown(false);
  };

  const handleFont = (font, label) => {
    execCommand('fontName', font);
    setFontLabel(label);
    setShowFontDropdown(false);
  };

  const handleFontSize = (size, label) => {
    execCommand('fontSize', size);
    setFontSizeLabel(label);
    setShowFontSizeDropdown(false);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgHtml = `<img src="${e.target.result}" style="width: 300px; max-width: 100%; height: auto; border-radius: 4px; display: inline-block; cursor: pointer; border: 1px solid transparent;" draggable="true" />`;
        execCommand('insertHTML', imgHtml);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) execCommand('createLink', url);
  };

  const insertTable = (overrideRows, overrideCols) => {
    restoreSelection();

    // Use override args if provided (from external API), else use state
    const r = overrideRows !== undefined ? overrideRows : tableRows;
    const c = overrideCols !== undefined ? overrideCols : tableCols;

    const rows = parseInt(r) || 3;
    const cols = parseInt(c) || 3;

    const tableHtml = `
      <table style="border-collapse: collapse; width: 100%; margin: 1em 0; border: 1px solid #e5e7eb; table-layout: fixed;">
        <tbody>
          ${Array(rows).fill(0).map(() => `
            <tr>
              ${Array(cols).fill(0).map(() => `
                <td style="border: 1px solid #d1d5db; padding: 8px; min-width: 30px; position: relative; width: ${100/cols}%;">
                  <br />
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p><br/></p>
    `;
    
    execCommand('insertHTML', tableHtml);
    setShowTableModal(false);
  };

  // --- Table Operations ---

  const tableAction = (action) => {
    if (!activeCell || !selectedNode) return;
    if (selectedNode.tagName !== 'TABLE') return;

    const row = activeCell.closest('tr');
    if (!row) return;

    const table = selectedNode; 
    const tbody = table.querySelector('tbody');
    const rowIndex = row.rowIndex;
    const colIndex = activeCell.cellIndex;

    if (colIndex === -1) return;

    const createCell = () => {
      const td = document.createElement('td');
      td.style.border = '1px solid #d1d5db';
      td.style.padding = '8px';
      td.style.minWidth = '30px';
      td.innerHTML = '<br>';
      return td;
    };

    if (action === 'row-above') {
        const newRow = row.cloneNode(false);
        Array.from(row.children).forEach(() => newRow.appendChild(createCell()));
        tbody.insertBefore(newRow, row);
    } else if (action === 'row-below') {
        const newRow = row.cloneNode(false);
        Array.from(row.children).forEach(() => newRow.appendChild(createCell()));
        tbody.insertBefore(newRow, row.nextSibling);
    } else if (action === 'col-left') {
        Array.from(table.rows).forEach(tr => {
            const refCell = tr.children[colIndex];
            if (refCell) tr.insertBefore(createCell(), refCell);
        });
    } else if (action === 'col-right') {
        Array.from(table.rows).forEach(tr => {
            const refCell = tr.children[colIndex];
            if (refCell) tr.insertBefore(createCell(), refCell.nextSibling);
        });
    } else if (action === 'del-row') {
        row.remove();
        if (tbody.children.length === 0) {
           table.remove();
           setSelectedNode(null);
           setActiveCell(null);
        } else {
           if (!activeCell.isConnected) setActiveCell(null);
        }
    } else if (action === 'del-col') {
        Array.from(table.rows).forEach(tr => {
            if (tr.children[colIndex]) tr.children[colIndex].remove();
        });
        if (table.rows[0] && table.rows[0].children.length === 0) {
            table.remove();
            setSelectedNode(null);
            setActiveCell(null);
        } else {
             if (!activeCell.isConnected) setActiveCell(null);
        }
    } else if (action === 'del-table') {
        table.remove();
        setSelectedNode(null);
        setActiveCell(null);
    }

    handleInput();
    updateOverlay();
  };

  // --- Selection & Overlay Logic ---

  const updateOverlay = useCallback(() => {
    if (!editorRef.current || isSourceMode) return;

    // 1. Update Selection Box (Image/Table border)
    if (selectedNode && selectedNode.isConnected) {
      const rect = selectedNode.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      setOverlayStyle({
        top: rect.top - editorRect.top,
        left: rect.left - editorRect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setOverlayStyle(null);
    }

    // 2. Update Column Resize Handles
    const table = selectedNode?.tagName === 'TABLE' ? selectedNode : activeCell?.closest('table');
    
    if (table && table.isConnected) {
      const tableRect = table.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      const newResizers = [];
      
      const firstRow = table.rows[0];
      if (firstRow) {
        Array.from(firstRow.cells).forEach((cell) => {
          const cellRect = cell.getBoundingClientRect();
          newResizers.push({
            left: (cellRect.left - editorRect.left) + cellRect.width,
            top: tableRect.top - editorRect.top,
            height: tableRect.height,
            cell: cell
          });
        });
      }
      setColResizers(newResizers);
    } else {
      setColResizers([]);
    }

  }, [selectedNode, activeCell, isSourceMode]);

  useEffect(() => {
    document.execCommand('enableObjectResizing', false, 'false');

    const handleScroll = () => {
      updateOverlay();
    };
    const handleResize = () => {
       updateOverlay();
    };
    
    const scrollContainer = editorRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOverlay]);

  const handleEditorClick = (e) => {
    if (isSourceMode) return;
    const target = e.target;
    
    const cell = target.closest('td') || target.closest('th');
    const tableTarget = target.closest('table');
    const imgTarget = target.tagName === 'IMG' ? target : target.closest('img');
    
    if (cell) {
      setActiveCell(cell);
      const table = cell.closest('table');
      if (table && selectedNode !== table) {
         setSelectedNode(table);
      }
    } else {
      if (!isColResizing) setActiveCell(null);
    }

    if (imgTarget) {
      if (selectedNode !== imgTarget) {
        setSelectedNode(imgTarget);
      }
      return;
    } 
    
    if (tableTarget && tableTarget !== editorRef.current) {
       if (selectedNode !== tableTarget) {
         setSelectedNode(tableTarget);
       }
       return;
    }

    if (!isResizing && !isColResizing && selectedNode && !tableTarget && !imgTarget && !cell) {
      setSelectedNode(null);
      setOverlayStyle(null);
      setActiveCell(null);
      setColResizers([]);
    }
    
    checkActiveFormats();
  };

  const handleContextMenu = (e) => {
    if (isSourceMode) return;
    const target = e.target;
    const imgTarget = target.tagName === 'IMG' ? target : target.closest('img');
    const cellTarget = target.closest('td') || target.closest('th');
    const tableTarget = target.closest('table');
    
    if (imgTarget) {
      e.preventDefault(); // Prevent browser context menu
      if (selectedNode !== imgTarget) {
        setSelectedNode(imgTarget);
      }
      setTimeout(updateOverlay, 0);
      return;
    }

    if (cellTarget || tableTarget) {
      e.preventDefault();
      
      // Determine table
      const table = tableTarget || (cellTarget ? cellTarget.closest('table') : null);
      
      // Set active cell if clicked on one
      if (cellTarget) {
        setActiveCell(cellTarget);
      }
      
      // Select the table
      if (table && selectedNode !== table) {
        setSelectedNode(table);
      }
      
      setTimeout(updateOverlay, 0);
    }
  };

  // --- Resize Logic (Table & Image) ---

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedNode) return;

    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: selectedNode.offsetWidth,
      target: selectedNode
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!resizeRef.current.target) return;
    
    const dx = e.clientX - resizeRef.current.startX;
    const newWidth = Math.max(50, resizeRef.current.startWidth + dx);
    resizeRef.current.target.style.width = `${newWidth}px`;
    updateOverlay(); 
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    resizeRef.current = { startX: 0, startWidth: 0, target: null };
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- Column Resize Logic ---

  const startColResize = (e, cell) => {
     e.preventDefault();
     e.stopPropagation();
     if (!cell) return;

     setIsColResizing(true);
     colResizeRef.current = {
       startX: e.clientX,
       startWidth: cell.offsetWidth,
       target: cell
     };

     document.addEventListener('mousemove', handleColMouseMove);
     document.addEventListener('mouseup', handleColMouseUp);
  };

  const handleColMouseMove = (e) => {
     if (!colResizeRef.current.target) return;
     const dx = e.clientX - colResizeRef.current.startX;
     const newWidth = Math.max(20, colResizeRef.current.startWidth + dx);
     colResizeRef.current.target.style.width = `${newWidth}px`;
     updateOverlay();
  };

  const handleColMouseUp = () => {
     setIsColResizing(false);
     colResizeRef.current = { startX: 0, startWidth: 0, target: null };
     document.removeEventListener('mousemove', handleColMouseMove);
     document.removeEventListener('mouseup', handleColMouseUp);
  };

  // --- Node Manipulation Actions ---

  const alignNode = (alignment) => {
    if (!selectedNode) return;
    
    // Reset layout styles
    selectedNode.style.display = '';
    selectedNode.style.float = '';
    selectedNode.style.margin = '';
    selectedNode.style.outline = 'none';

    if (alignment === 'left') {
      selectedNode.style.float = 'left';
      selectedNode.style.margin = '0 1rem 1rem 0';
    } else if (alignment === 'right') {
      selectedNode.style.float = 'right';
      selectedNode.style.margin = '0 0 1rem 1rem';
    } else if (alignment === 'center') {
      selectedNode.style.display = 'block';
      selectedNode.style.marginLeft = 'auto';
      selectedNode.style.marginRight = 'auto';
    } else {
      // Default / Reset
      selectedNode.style.display = 'inline-block';
    }
    
    // Force immediate update of overlay after style change
    setTimeout(updateOverlay, 0);
  };

  // --- Existing State Check ---

  const checkActiveFormats = () => {
    if (!editorRef.current || isSourceMode) return;
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelection.current = range.cloneRange();
        
        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) container = container.parentNode;
        
        const cell = container.closest('td') || container.closest('th');
        const table = container.closest('table');
        
        if (cell) {
          if (activeCell !== cell) setActiveCell(cell);
        }
        
        if (table) {
          if (selectedNode !== table) setSelectedNode(table);
        } else if (!isResizing && !isColResizing && !container.closest('img')) {
          if(selectedNode && selectedNode.tagName === 'TABLE') {
              setSelectedNode(null);
              setActiveCell(null);
          }
        }

        const fontSizeVal = document.queryCommandValue('fontSize');
        const sizeMap = {
          '1': '10px', '2': '13px', '3': '16px', '4': '18px',
          '5': '24px', '6': '32px', '7': '48px'
        };
        if (fontSizeVal && sizeMap[fontSizeVal]) {
           setFontSizeLabel(sizeMap[fontSizeVal]);
        } else {
           setFontSizeLabel('16px');
        }

        const fontFace = document.queryCommandValue('fontName');
        if (fontFace.includes('Serif')) setFontLabel('Serif');
        else if (fontFace.includes('Mono')) setFontLabel('Monospace');
        else setFontLabel('Sans Serif');
      }
    }

    const formats = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikethrough'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    };
    setActiveFormats(formats);
    
    if (selection.rangeCount > 0) {
      try {
        const container = selection.getRangeAt(0).commonAncestorContainer;
        const parentBlock = container.nodeType === 3 ? container.parentNode : container;
        const tagName = parentBlock?.tagName?.toLowerCase();
        
        if (tagName === 'h1') setHeadingLabel('Heading 1');
        else if (tagName === 'h2') setHeadingLabel('Heading 2');
        else if (tagName === 'h3') setHeadingLabel('Heading 3');
        else if (tagName === 'blockquote') setHeadingLabel('Quote');
        else setHeadingLabel('Normal');

      } catch (e) { }
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => checkActiveFormats();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [activeCell, selectedNode, isResizing, isColResizing, isSourceMode]);

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title, hasArrow = false, disabled = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors duration-150 flex items-center justify-center gap-1
        ${isActive 
          ? 'bg-indigo-100 text-indigo-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        `}
    >
      <Icon size={18} strokeWidth={2.5} />
      {hasArrow && <ChevronDown size={12} className="opacity-50" />}
    </button>
  );

  const Separator = () => (
    <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col font-sans text-gray-800 min-h-[300px] ${className}`}>
        
        {/* --- Toolbar --- */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-white sticky top-0 z-20 select-none shadow-sm">
          
          {/* Source View Toggle (Leftmost or Rightmost) - Left for prominence */}
          <ToolbarButton 
            onClick={toggleSourceMode} 
            isActive={isSourceMode} 
            icon={FileCode} 
            title={isSourceMode ? "Switch to Visual Editor" : "View Source / HTML"} 
          />
          <Separator />

          <div className="flex items-center">
            <ToolbarButton onClick={() => execCommand('undo')} icon={Undo} title="Undo" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('redo')} icon={Redo} title="Redo" disabled={isSourceMode} />
          </div>
          <Separator />

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                disabled={isSourceMode}
                onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm font-medium rounded-md min-w-[100px] ${isSourceMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="truncate">{headingLabel}</span>
                <ChevronDown size={14} />
              </button>
              {showHeadingDropdown && !isSourceMode && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg py-1 z-30">
                  {[
                    { label: 'Normal', tag: 'P' },
                    { label: 'Heading 1', tag: 'H1' },
                    { label: 'Heading 2', tag: 'H2' },
                    { label: 'Heading 3', tag: 'H3' },
                    { label: 'Quote', tag: 'BLOCKQUOTE' },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      onClick={() => handleHeading(item.tag, item.label)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Font Family Dropdown */}
            <div className="relative hidden md:block">
              <button
                disabled={isSourceMode}
                onClick={() => setShowFontDropdown(!showFontDropdown)}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm font-medium rounded-md min-w-[130px] ${isSourceMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="truncate">{fontLabel}</span>
                <ChevronDown size={14} />
              </button>
              {showFontDropdown && !isSourceMode && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
                  {[
                    { label: 'Sans Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
                    { label: 'Serif', value: 'ui-serif, Georgia, serif' },
                    { label: 'Monospace', value: 'ui-monospace, monospace' },
                    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
                    { label: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
                    { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
                    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
                    { label: 'Georgia', value: 'Georgia, serif' },
                    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
                    { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
                    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
                    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
                    { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
                    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleFont(item.value, item.label)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                      style={{ fontFamily: item.value }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown */}
            <div className="relative hidden md:block">
              <button
                disabled={isSourceMode}
                onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm font-medium rounded-md min-w-[70px] ${isSourceMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="truncate">{fontSizeLabel}</span>
                <ChevronDown size={14} />
              </button>
              {showFontSizeDropdown && !isSourceMode && (
                <div className="absolute top-full left-0 mt-1 w-24 bg-white border border-gray-200 rounded shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
                  {[
                    { label: '10px', value: '1' },
                    { label: '13px', value: '2' },
                    { label: '16px', value: '3' },
                    { label: '18px', value: '4' },
                    { label: '24px', value: '5' },
                    { label: '32px', value: '6' },
                    { label: '48px', value: '7' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleFontSize(item.value, item.label)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Separator />
          
          {/* Formats */}
          <div className="flex items-center">
            <ToolbarButton onClick={() => execCommand('bold')} isActive={activeFormats.bold} icon={Bold} title="Bold" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('italic')} isActive={activeFormats.italic} icon={Italic} title="Italic" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('underline')} isActive={activeFormats.underline} icon={Underline} title="Underline" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('strikethrough')} isActive={activeFormats.strikethrough} icon={Strikethrough} title="Strikethrough" disabled={isSourceMode} />
          </div>
          <Separator />
          {/* Sub/Sup/Code */}
           <div className="flex items-center">
             <ToolbarButton onClick={() => execCommand('subscript')} isActive={activeFormats.subscript} icon={Subscript} title="Subscript" disabled={isSourceMode} />
             <ToolbarButton onClick={() => execCommand('superscript')} isActive={activeFormats.superscript} icon={Superscript} title="Superscript" disabled={isSourceMode} />
             <ToolbarButton onClick={() => execCommand('formatBlock', 'PRE')} icon={Code} title="Code Block" disabled={isSourceMode} />
             <ToolbarButton onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} icon={Quote} title="Blockquote" disabled={isSourceMode} />
          </div>
          <Separator />
          {/* Colors */}
          <div className="flex items-center relative">
             <div className="relative">
                <ToolbarButton onClick={() => textColorRef.current.click()} icon={Type} title="Text Color" disabled={isSourceMode} />
                <input 
                  type="color" 
                  ref={textColorRef}
                  disabled={isSourceMode}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                  onChange={(e) => execCommand('foreColor', e.target.value)}
                />
             </div>
             <div className="relative">
                <ToolbarButton onClick={() => bgColorRef.current.click()} icon={Highlighter} title="Highlight Color" disabled={isSourceMode} />
                <input 
                  type="color" 
                  ref={bgColorRef}
                  disabled={isSourceMode}
                  defaultValue="#ffff00"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                  onChange={(e) => execCommand('hiliteColor', e.target.value)}
                />
             </div>
          </div>
          <Separator />
          {/* Align/List */}
          <div className="flex items-center">
            <ToolbarButton onClick={() => execCommand('justifyLeft')} isActive={activeFormats.justifyLeft} icon={AlignLeft} title="Align Left" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('justifyCenter')} isActive={activeFormats.justifyCenter} icon={AlignCenter} title="Align Center" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('justifyRight')} isActive={activeFormats.justifyRight} icon={AlignRight} title="Align Right" disabled={isSourceMode} />
            <div className="mx-1"></div>
            <ToolbarButton onClick={() => execCommand('insertUnorderedList')} isActive={activeFormats.insertUnorderedList} icon={List} title="Bullet List" disabled={isSourceMode} />
            <ToolbarButton onClick={() => execCommand('insertOrderedList')} isActive={activeFormats.insertOrderedList} icon={ListOrdered} title="Numbered List" disabled={isSourceMode} />
          </div>
          <Separator />
          {/* Indent */}
          <div className="flex items-center">
             <ToolbarButton onClick={() => execCommand('indent')} icon={Indent} title="Indent" disabled={isSourceMode} />
             <ToolbarButton onClick={() => execCommand('outdent')} icon={Outdent} title="Outdent" disabled={isSourceMode} />
          </div>
          <Separator />
          {/* Inserts */}
          <div className="flex items-center">
            <ToolbarButton onClick={insertLink} icon={LinkIcon} title="Insert Link" disabled={isSourceMode} />
            <div className="relative">
               <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={ImageIcon} title="Upload Image" disabled={isSourceMode} />
               <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" disabled={isSourceMode} />
            </div>
            <ToolbarButton onClick={() => execCommand('insertHorizontalRule')} icon={Minus} title="Horizontal Line" disabled={isSourceMode} />
            <div className="relative">
              <ToolbarButton onClick={() => setShowTableModal(!showTableModal)} icon={TableIcon} title="Insert Table" disabled={isSourceMode} />
              {showTableModal && !isSourceMode && (
                <div 
                  className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 shadow-xl rounded-lg z-30 w-48"
                  onClick={(e) => e.stopPropagation()} 
                >
                  <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Table Size</h4>
                  <div className="flex flex-col gap-2 mb-3">
                     <label className="text-sm flex justify-between">Rows: <input type="number" min="1" max="10" value={tableRows} onChange={(e) => setTableRows(e.target.value)} className="w-12 border border-gray-300 rounded px-1 text-right" /></label>
                     <label className="text-sm flex justify-between">Cols: <input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(e.target.value)} className="w-12 border border-gray-300 rounded px-1 text-right" /></label>
                  </div>
                  <button onClick={() => insertTable()} className="w-full bg-indigo-600 text-white text-xs font-bold py-1.5 rounded hover:bg-indigo-700 transition-colors">Insert Table</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-grow" /> 
          <div className="flex items-center border-l border-gray-200 pl-2">
             <ToolbarButton onClick={() => execCommand('removeFormat')} icon={RemoveFormatting} title="Clear Formatting" disabled={isSourceMode} />
             <div className="ml-1 pl-1 border-l border-gray-200 hidden md:block">
                <ToolbarButton onClick={() => {}} icon={X} title="Close" />
             </div>
          </div>
        </div>

        {/* --- Content Area --- */}
        <div className="flex-grow overflow-hidden flex flex-col relative">
          
          {isSourceMode ? (
            <textarea
              ref={sourceRef}
              value={sourceContent}
              onChange={handleSourceInput}
              className="flex-grow p-4 w-full h-full resize-none font-mono text-sm bg-gray-50 text-gray-800 outline-none"
              spellCheck="false"
            />
          ) : (
            <>
              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="flex-grow p-4 md:p-8 overflow-y-auto outline-none prose prose-indigo max-w-none prose-lg relative z-0"
                onInput={handleInput}
                onClick={handleEditorClick}
                onContextMenu={handleContextMenu}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') { e.preventDefault(); execCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
                }}
              />
              
              {/* Placeholder Overlay */}
              {isEmpty && (
                <div className="absolute top-4 left-4 md:top-8 md:left-8 right-4 md:right-8 pointer-events-none">
                  <div className="prose prose-indigo max-w-none prose-lg text-gray-400">
                    <p>{placeholder}</p>
                  </div>
                </div>
              )}

              {/* --- Interactive Overlay for Resize/Move --- */}
              {selectedNode && overlayStyle && (
                <div 
                  className="absolute pointer-events-none z-50"
                  style={{
                    top: overlayStyle.top,
                    left: overlayStyle.left,
                    width: overlayStyle.width,
                    height: overlayStyle.height,
                    border: '2px solid #3b82f6', // blue-500
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Toolbar floating above node */}
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-lg border border-gray-200 rounded-md flex p-1 pointer-events-auto gap-1 whitespace-nowrap">
                    {selectedNode.tagName === 'IMG' && (
                      <>
                        <button onMouseDown={(e) => {e.preventDefault(); alignNode('left')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Align Left"><AlignLeft size={16}/></button>
                        <button onMouseDown={(e) => {e.preventDefault(); alignNode('center')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Align Center"><AlignCenter size={16}/></button>
                        <button onMouseDown={(e) => {e.preventDefault(); alignNode('right')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Align Right"><AlignRight size={16}/></button>
                      </>
                    )}
                    
                    {/* Table Specific Options */}
                    {selectedNode.tagName === 'TABLE' && activeCell && (
                      <>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('row-above')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Insert Row Above"><ArrowUp size={16}/></button>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('row-below')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Insert Row Below"><ArrowDown size={16}/></button>
                        <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('col-left')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Insert Col Left"><ArrowLeft size={16}/></button>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('col-right')}} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Insert Col Right"><ArrowRight size={16}/></button>
                        <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('del-row')}} className="p-1 hover:bg-red-50 text-red-500 rounded font-xs flex items-center" title="Delete Row"><Trash2 size={14} className="mr-0.5"/>R</button>
                        <button onMouseDown={(e) => {e.preventDefault(); tableAction('del-col')}} className="p-1 hover:bg-red-50 text-red-500 rounded font-xs flex items-center" title="Delete Column"><Trash2 size={14} className="mr-0.5"/>C</button>
                      </>
                    )}

                    <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                    <button onMouseDown={(e) => {e.preventDefault(); selectedNode.tagName === 'TABLE' ? tableAction('del-table') : selectedNode.remove(); setSelectedNode(null);}} className="p-1 hover:bg-red-50 text-red-500 rounded" title={selectedNode.tagName === 'TABLE' ? "Delete Table" : "Delete"}>
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  {/* Resize Handle (Bottom Right) */}
                  <div 
                    className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform border-2 border-white z-50"
                    onMouseDown={startResize}
                  />
                </div>
              )}

              {/* --- Column Resize Handles (All Columns) --- */}
              {colResizers.map((resizer, index) => (
                <div 
                  key={index}
                  className="absolute z-50 cursor-col-resize flex items-center justify-center hover:bg-blue-400 hover:opacity-50 transition-colors"
                  style={{
                      top: resizer.top,
                      left: resizer.left - 4, // Center on border
                      width: '8px',
                      height: resizer.height,
                      pointerEvents: 'auto',
                  }}
                  onMouseDown={(e) => startColResize(e, resizer.cell)}
                  title="Resize Column"
                >
                  {/* Visual Line */}
                  <div className="w-0.5 h-full bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
            </>
          )}

        </div>
        
        <style>{`
          .prose { display: flow-root; } 
          .prose p { display: flow-root; margin-top: 0.5em; margin-bottom: 0.5em; line-height: 1.4; } 
          .prose table { width: auto; max-width: 100%; table-layout: fixed; border-collapse: collapse; margin: 1em 0; }
          .prose td, .prose th { border: 1px solid #d1d5db; padding: 0.75rem; vertical-align: top; position: relative; }
          .prose th { background-color: #f3f4f6; font-weight: 600; }
          .prose h1 { font-size: 2.25em; margin-top: 0.5em; margin-bottom: 0.5em; line-height: 1.1; font-weight: 800; color: #111827; }
          .prose h2 { font-size: 1.75em; margin-top: 0.5em; margin-bottom: 0.5em; line-height: 1.2; font-weight: 700; color: #1f2937; }
          .prose h3 { font-size: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; line-height: 1.3; font-weight: 600; color: #374151; }
          .prose ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
          .prose ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
          .prose li { margin: 0.5em 0; }
          .prose blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; font-style: italic; color: #4b5563; background: #f9fafb; padding: 1rem; border-radius: 0 0.5rem 0.5rem 0; }
          .prose pre { background-color: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-family: monospace; }
          .prose img { border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .prose hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
          ::selection { background-color: #c7d2fe; color: #1e1b4b; }
        `}</style>
    </div>
  );
});

export default OpenTextEditor;