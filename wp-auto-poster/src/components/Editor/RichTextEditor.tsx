import { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Code2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [mode, setMode] = useState<'rich' | 'html'>('rich');
  const [htmlValue, setHtmlValue] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Heading.configure({ levels: [2, 3, 4] }),
      Link.configure({ openOnClick: false }),
      CodeBlock,
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlValue(html);
      onChange(html);
    },
  });

  // Sync from outside
  useEffect(() => {
    if (editor && value !== editor.getHTML() && mode === 'rich') {
      editor.commands.setContent(value);
      setHtmlValue(value);
    }
  }, [value, editor, mode]);

  const handleHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setHtmlValue(newHtml);
    onChange(newHtml);
  }, [onChange]);

  const handleModeSwitch = useCallback((newMode: 'rich' | 'html') => {
    if (newMode === 'html' && editor) {
      setHtmlValue(editor.getHTML());
    } else if (newMode === 'rich' && editor) {
      editor.commands.setContent(htmlValue);
    }
    setMode(newMode);
  }, [editor, htmlValue]);

  const addLink = useCallback(() => {
    const url = window.prompt('URLを入力してください:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        {mode === 'rich' && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="太字"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="斜体"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="下線"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="見出しH2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="見出しH3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              isActive={editor.isActive('heading', { level: 4 })}
              title="見出しH4"
            >
              <Heading4 className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="箇条書き"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="番号付きリスト"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="引用"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="インラインコード"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="コードブロック"
            >
              <Code2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={addLink}
              isActive={editor.isActive('link')}
              title="リンク"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}

        <div className="ml-auto flex">
          <button
            type="button"
            onClick={() => handleModeSwitch('rich')}
            className={`px-2 py-1 text-xs rounded-l border transition-colors ${
              mode === 'rich'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            リッチ
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('html')}
            className={`px-2 py-1 text-xs rounded-r border-t border-r border-b transition-colors ${
              mode === 'html'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      {/* Content area */}
      {mode === 'rich' ? (
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none p-4 min-h-64 text-gray-900 dark:text-gray-100 focus-within:outline-none"
        />
      ) : (
        <textarea
          value={htmlValue}
          onChange={handleHtmlChange}
          className="w-full min-h-64 p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y focus:outline-none"
          placeholder="HTMLを直接入力..."
          spellCheck={false}
        />
      )}
    </div>
  );
}
