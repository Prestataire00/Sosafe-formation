import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Variable,
  Undo,
  Redo,
  Pilcrow,
  Palette,
} from "lucide-react";
import { TEMPLATE_VARIABLES } from "@shared/schema";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** If provided, renders the editor with branding styles applied */
  brandColor?: string;
  fontFamily?: string;
}

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, brandColor }: { editor: Editor; brandColor?: string }) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const insertVariable = (key: string) => {
    editor.chain().focus().insertContent(key).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5 bg-muted/40">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler" disabled={!editor.can().undo()}>
        <Undo className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir" disabled={!editor.can().redo()}>
        <Redo className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Titre 1"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Titre 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Titre 3"
      >
        <Heading3 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
        title="Paragraphe"
      >
        <Pilcrow className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Gras"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italique"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Barré"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>

      {/* Text color */}
      <div className="relative">
        <ToolbarButton
          onClick={() => colorInputRef.current?.click()}
          title="Couleur du texte"
        >
          <Palette className="w-3.5 h-3.5" />
        </ToolbarButton>
        <input
          ref={colorInputRef}
          type="color"
          className="absolute opacity-0 w-0 h-0"
          defaultValue={brandColor || "#000000"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Aligner à gauche"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Centrer"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Aligner à droite"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justifier"
      >
        <AlignJustify className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Liste à puces"
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Liste numérotée"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Table */}
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insérer un tableau"
      >
        <TableIcon className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Variable insertion */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Insérer une variable"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Variable className="w-3.5 h-3.5" />
            <span>Variable</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[400px] overflow-y-auto w-64">
          {Object.entries(TEMPLATE_VARIABLES).map(([category, vars]) => (
            <div key={category}>
              <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                {category}
              </DropdownMenuLabel>
              {vars.map((v) => (
                <DropdownMenuItem
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="text-xs cursor-pointer"
                >
                  <code className="text-primary mr-2">{v.key}</code>
                  <span className="text-muted-foreground truncate">{v.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, brandColor, fontFamily }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder || "Commencez à rédiger votre modèle..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[280px] p-4 focus:outline-none",
        style: [
          fontFamily ? `font-family: ${fontFamily}, sans-serif` : "",
        ].filter(Boolean).join(";"),
      },
    },
  });

  // Sync external value changes (e.g. when editing an existing template)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className="border rounded-md overflow-hidden"
      style={brandColor ? { borderColor: brandColor + "44" } : {}}
    >
      <Toolbar editor={editor} brandColor={brandColor} />
      <div
        className="bg-white dark:bg-background"
        style={fontFamily ? { fontFamily: `${fontFamily}, sans-serif` } : {}}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
