'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Extension } from '@tiptap/core';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  CodeOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { Button, Divider, Dropdown, Input, Tooltip } from 'antd';

const STYLE_ATTR_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'link',
  'hardBreak',
] as const;

function attrHelpers(name: string) {
  return {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute(name),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs[name] ? { [name]: attrs[name] as string } : {},
  };
}

/** Keep inline styles / email layout attrs through TipTap round-trips. */
const PreserveAttrs = Extension.create({
  name: 'preserveAttrs',
  addGlobalAttributes() {
    return [
      {
        types: [...STYLE_ATTR_TYPES],
        attributes: {
          style: attrHelpers('style'),
          class: attrHelpers('class'),
          align: attrHelpers('align'),
          width: attrHelpers('width'),
          role: attrHelpers('role'),
          cellpadding: attrHelpers('cellpadding'),
          cellspacing: attrHelpers('cellspacing'),
          valign: attrHelpers('valign'),
        },
      },
    ];
  },
});

function ToolbarBtn({
  title,
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
}) {
  return (
    <Tooltip title={title}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        disabled={disabled}
        onClick={onClick}
        icon={icon}
      >
        {label}
      </Button>
    </Tooltip>
  );
}

function EditorToolbar({
  editor,
  sourceMode,
  onToggleSource,
  variables,
  onInsertVariable,
}: {
  editor: Editor | null;
  sourceMode: boolean;
  onToggleSource: () => void;
  variables?: string[];
  onInsertVariable?: (name: string) => void;
}) {
  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        padding: '8px 10px',
        borderBottom: '1px solid var(--color-border, #e3dfd8)',
        background: 'var(--color-brand-50, #f0f7f4)',
      }}
    >
      {!sourceMode && (
        <>
          <ToolbarBtn
            title="Bold"
            active={editor?.isActive('bold')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            icon={<BoldOutlined />}
          />
          <ToolbarBtn
            title="Italic"
            active={editor?.isActive('italic')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            icon={<ItalicOutlined />}
          />
          <ToolbarBtn
            title="Underline"
            active={editor?.isActive('underline')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            icon={<UnderlineOutlined />}
          />
          <ToolbarBtn
            title="Strikethrough"
            active={editor?.isActive('strike')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            icon={<StrikethroughOutlined />}
          />
          <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />
          <ToolbarBtn
            title="Heading 2"
            active={editor?.isActive('heading', { level: 2 })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            label="H2"
          />
          <ToolbarBtn
            title="Heading 3"
            active={editor?.isActive('heading', { level: 3 })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            label="H3"
          />
          <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />
          <ToolbarBtn
            title="Bullet list"
            active={editor?.isActive('bulletList')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            icon={<UnorderedListOutlined />}
          />
          <ToolbarBtn
            title="Numbered list"
            active={editor?.isActive('orderedList')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            icon={<OrderedListOutlined />}
          />
          <ToolbarBtn
            title="Link"
            active={editor?.isActive('link')}
            disabled={!editor}
            onClick={setLink}
            icon={<LinkOutlined />}
          />
          <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />
          <ToolbarBtn
            title="Align left"
            active={editor?.isActive({ textAlign: 'left' })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            icon={<AlignLeftOutlined />}
          />
          <ToolbarBtn
            title="Align center"
            active={editor?.isActive({ textAlign: 'center' })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            icon={<AlignCenterOutlined />}
          />
          <ToolbarBtn
            title="Align right"
            active={editor?.isActive({ textAlign: 'right' })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            icon={<AlignRightOutlined />}
          />
          <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />
          <ToolbarBtn
            title="Undo"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
            icon={<UndoOutlined />}
          />
          <ToolbarBtn
            title="Redo"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
            icon={<RedoOutlined />}
          />
        </>
      )}

      <div style={{ flex: 1 }} />

      {variables && variables.length > 0 && onInsertVariable && (
        <Dropdown
          menu={{
            items: variables.map((v) => ({
              key: v,
              label: `{{${v}}}`,
              onClick: () => onInsertVariable(v),
            })),
          }}
        >
          <Button size="small">Insert variable</Button>
        </Dropdown>
      )}

      <ToolbarBtn
        title={sourceMode ? 'Visual editor' : 'HTML source'}
        active={sourceMode}
        onClick={onToggleSource}
        icon={<CodeOutlined />}
      />
    </div>
  );
}

export type RichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Optional merge-tag names shown in "Insert variable" */
  variables?: string[];
  /** Start in HTML source mode (safer for nested email tables) */
  defaultSourceMode?: boolean;
};

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write content…',
  minHeight = 220,
  variables,
  defaultSourceMode = false,
}: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(defaultSourceMode);
  const [sourceDraft, setSourceDraft] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      PreserveAttrs,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rt-prose',
        style: `min-height:${minHeight}px;outline:none;padding:14px 16px;`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!sourceMode) onChange?.(ed.getHTML());
    },
  });

  // Sync external value → editor (template switch, form reset)
  useEffect(() => {
    if (!editor || sourceMode) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor, sourceMode]);

  useEffect(() => {
    setSourceDraft(value || '');
  }, [value]);

  const toggleSource = () => {
    if (sourceMode) {
      // HTML → visual
      editor?.commands.setContent(sourceDraft || '', { emitUpdate: false });
      onChange?.(sourceDraft);
      setSourceMode(false);
      return;
    }
    // Visual → HTML
    const html = editor?.getHTML() ?? sourceDraft;
    setSourceDraft(html);
    onChange?.(html);
    setSourceMode(true);
  };

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`;
    if (sourceMode) {
      const next = `${sourceDraft}${sourceDraft && !sourceDraft.endsWith(' ') ? ' ' : ''}${token}`;
      setSourceDraft(next);
      onChange?.(next);
      return;
    }
    editor?.chain().focus().insertContent(token).run();
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-border, #e3dfd8)',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <EditorToolbar
        editor={editor}
        sourceMode={sourceMode}
        onToggleSource={toggleSource}
        variables={variables}
        onInsertVariable={insertVariable}
      />

      {sourceMode ? (
        <Input.TextArea
          value={sourceDraft}
          onChange={(e) => {
            setSourceDraft(e.target.value);
            onChange?.(e.target.value);
          }}
          rows={Math.max(8, Math.round(minHeight / 22))}
          style={{
            border: 'none',
            borderRadius: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <style>{`
        .rt-prose p { margin: 0 0 0.75em; }
        .rt-prose h2 { margin: 0 0 0.5em; font-size: 1.25em; font-weight: 700; }
        .rt-prose h3 { margin: 0 0 0.5em; font-size: 1.1em; font-weight: 700; }
        .rt-prose ul, .rt-prose ol { padding-left: 1.4em; margin: 0 0 0.75em; }
        .rt-prose a { color: var(--color-brand, #0b3d2e); text-decoration: underline; }
        .rt-prose table { border-collapse: collapse; width: 100%; margin: 0 0 0.75em; }
        .rt-prose td, .rt-prose th { border: 1px dashed var(--color-border, #e3dfd8); padding: 6px 8px; vertical-align: top; }
        .rt-prose .is-editor-empty:first-child::before {
          color: var(--color-text-tertiary, #a39e94);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
