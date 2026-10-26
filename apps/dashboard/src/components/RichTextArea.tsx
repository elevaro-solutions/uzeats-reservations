'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

const HTML_START = /^<(p|h[1-6]|ul|ol|blockquote|pre|table)\b/i;

export function looksLikeRichHtml(value: string) {
  return HTML_START.test(value.trim());
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Plain notes stay plain text. Markup is only stored once the user formats. */
export function toEditorHtml(value: string) {
  if (!value) return '';
  if (looksLikeRichHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function meaningfulAttrs(attrs?: Record<string, unknown>) {
  if (!attrs) return false;
  return Object.entries(attrs).some(([key, value]) => {
    if (value == null || value === '' || value === false) return false;
    if (key === 'textAlign' && (value === 'left' || value === 'start')) return false;
    return true;
  });
}

function docIsPlain(node: JSONContent): boolean {
  if (node.marks && node.marks.length > 0) return false;
  if (
    node.type &&
    node.type !== 'doc' &&
    node.type !== 'paragraph' &&
    node.type !== 'text' &&
    node.type !== 'hardBreak'
  ) {
    return false;
  }
  if (meaningfulAttrs(node.attrs as Record<string, unknown> | undefined)) return false;
  return (node.content ?? []).every(docIsPlain);
}

export function serializeEditor(editor: Editor) {
  if (docIsPlain(editor.getJSON())) {
    return editor.getText({ blockSeparator: '\n\n' });
  }
  const html = editor.getHTML().trim();
  if (!html || html === '<p></p>' || html === '<p><br></p>') return '';
  return html;
}

function ToolbarBtn({
  title,
  active,
  disabled,
  onClick,
  icon,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        disabled={disabled}
        onClick={onClick}
        icon={icon}
        aria-label={title}
      />
    </Tooltip>
  );
}

function EditorToolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const setLink = () => {
    if (!editor || disabled) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const run = (command: () => void) => {
    if (!editor || disabled) return;
    command();
  };

  return (
    <div className="rt-rich-text__toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarBtn
        title="Bold"
        active={editor?.isActive('bold')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleBold().run())}
        icon={<BoldOutlined />}
      />
      <ToolbarBtn
        title="Italic"
        active={editor?.isActive('italic')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleItalic().run())}
        icon={<ItalicOutlined />}
      />
      <ToolbarBtn
        title="Underline"
        active={editor?.isActive('underline')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleUnderline().run())}
        icon={<UnderlineOutlined />}
      />
      <ToolbarBtn
        title="Strikethrough"
        active={editor?.isActive('strike')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleStrike().run())}
        icon={<StrikethroughOutlined />}
      />
      <ToolbarBtn
        title="Bulleted list"
        active={editor?.isActive('bulletList')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())}
        icon={<UnorderedListOutlined />}
      />
      <ToolbarBtn
        title="Numbered list"
        active={editor?.isActive('orderedList')}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())}
        icon={<OrderedListOutlined />}
      />
      <ToolbarBtn
        title="Align left"
        active={editor?.isActive({ textAlign: 'left' })}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().setTextAlign('left').run())}
        icon={<AlignLeftOutlined />}
      />
      <ToolbarBtn
        title="Align center"
        active={editor?.isActive({ textAlign: 'center' })}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().setTextAlign('center').run())}
        icon={<AlignCenterOutlined />}
      />
      <ToolbarBtn
        title="Align right"
        active={editor?.isActive({ textAlign: 'right' })}
        disabled={disabled || !editor}
        onClick={() => run(() => editor?.chain().focus().setTextAlign('right').run())}
        icon={<AlignRightOutlined />}
      />
      <ToolbarBtn
        title="Link"
        active={editor?.isActive('link')}
        disabled={disabled || !editor}
        onClick={setLink}
        icon={<LinkOutlined />}
      />
    </div>
  );
}

export type RichTextAreaProps = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Minimum visible lines, same as Ant Design TextArea `rows`. */
  rows?: number;
  maxRows?: number;
  /** Caps the saved string so existing field limits still pass. */
  maxLength?: number;
  style?: CSSProperties;
  className?: string;
  /** Enter sends. Shift+Enter inserts a line break. */
  submitOnEnter?: () => void;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
  'aria-required'?: boolean | 'true' | 'false';
};

export function RichTextArea({
  id,
  value = '',
  onChange,
  onBlur,
  placeholder,
  disabled,
  rows = 3,
  maxRows,
  maxLength,
  style,
  className,
  submitOnEnter,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
}: RichTextAreaProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const maxLengthRef = useRef(maxLength);
  const valueRef = useRef(value ?? '');
  const submitRef = useRef(submitOnEnter);
  const reverting = useRef(false);
  const [textCount, setTextCount] = useState(0);
  const [, setTick] = useState(0);

  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;
  maxLengthRef.current = maxLength;
  valueRef.current = value ?? '';
  submitRef.current = submitOnEnter;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: placeholder || '' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: toEditorHtml(value || ''),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'rt-rich-text__editor',
        ...(id ? { id } : {}),
      },
      handleDOMEvents: {
        blur: () => {
          onBlurRef.current?.();
          return false;
        },
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && submitRef.current) {
          event.preventDefault();
          submitRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (reverting.current) return;
      const next = serializeEditor(ed);
      const limit = maxLengthRef.current;
      const textLength = ed.getText().length;
      if (limit != null && (next.length > limit || textLength > limit)) {
        reverting.current = true;
        const undone = ed.commands.undo();
        if (!undone) {
          ed.commands.setContent(toEditorHtml(valueRef.current), { emitUpdate: false });
        }
        reverting.current = false;
        return;
      }
      setTextCount(textLength);
      if (next !== valueRef.current) onChangeRef.current?.(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || !id) return;
    editor.view.dom.id = id;
  }, [editor, id]);

  useEffect(() => {
    if (!editor) return;
    const next = value ?? '';
    if (serializeEditor(editor) !== next) {
      editor.commands.setContent(toEditorHtml(next), { emitUpdate: false });
    }
    setTextCount(editor.getText().length);
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((n) => n + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
  }, [editor]);

  const minHeight = Math.max(1, rows) * 22;
  const maxHeight = maxRows ? Math.max(maxRows, rows) * 22 : undefined;

  return (
    <div
      className={`rt-rich-text${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      style={
        {
          ...style,
          '--rt-rich-min': `${minHeight}px`,
          ...(maxHeight ? { '--rt-rich-max': `${maxHeight}px` } : {}),
        } as CSSProperties
      }
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      aria-required={ariaRequired}
    >
      <EditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
      {maxLength != null ? (
        <div className="rt-rich-text__count">
          {textCount} / {maxLength}
        </div>
      ) : null}
    </div>
  );
}
