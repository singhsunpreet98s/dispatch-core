import { cn } from '@/lib/utils';
import { Extension } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Heading1,
    Heading2,
    Heading3,
    Italic,
    Link2,
    Link2Off,
    List,
    ListOrdered,
    Redo,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

/**
 * Email clients add a blank line after every <p>. Writers expect Enter to move to
 * the next line, not to open a new paragraph, so Enter inserts a <br> and
 * Shift+Enter starts a real paragraph when a visible gap is wanted.
 */
const EnterAsLineBreak = Extension.create({
    name: 'enterAsLineBreak',
    priority: 1000,
    addKeyboardShortcuts() {
        return {
            Enter: () => {
                if (this.editor.isActive('listItem') || this.editor.isActive('codeBlock') || this.editor.isActive('blockquote')) {
                    return false;
                }
                return this.editor.commands.setHardBreak();
            },
            'Shift-Enter': () => {
                if (this.editor.isActive('listItem') || this.editor.isActive('codeBlock') || this.editor.isActive('blockquote')) {
                    return false;
                }
                return this.editor.commands.splitBlock();
            },
        };
    },
});

// Custom FontSize extension — adds fontSize to TextStyle inline styles.
const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
                renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
            },
        };
    },
    addCommands() {
        return {
            ...this.parent?.(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setFontSize: (size: string) => (helpers: any) => helpers.chain().setMark('textStyle', { fontSize: size }).run(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            unsetFontSize: () => (helpers: any) => helpers.chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

const DEFAULT_FONT_VALUE = "'Times New Roman', Times, serif";

const FONTS = [
    { label: 'Times New Roman', value: DEFAULT_FONT_VALUE, google: null },
    { label: 'Inter', value: "'Inter', sans-serif", google: 'Inter' },
    { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", google: 'Plus+Jakarta+Sans' },
    { label: 'DM Sans', value: "'DM Sans', sans-serif", google: 'DM+Sans' },
    { label: 'Outfit', value: "'Outfit', sans-serif", google: 'Outfit' },
    { label: 'Geist', value: "'Geist', sans-serif", google: 'Geist' },
    { label: 'Playfair Display', value: "'Playfair Display', Georgia, serif", google: 'Playfair+Display' },
    { label: 'Lora', value: "'Lora', Georgia, serif", google: 'Lora' },
    { label: 'Roboto', value: "'Roboto', Arial, sans-serif", google: 'Roboto' },
    { label: 'Georgia', value: 'Georgia, serif', google: null },
    { label: 'Arial', value: 'Arial, sans-serif', google: null },
] as const;

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const GOOGLE_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=' +
    FONTS.filter((f) => f.google)
        .map((f) => `${f.google}:wght@400;500;600;700`)
        .join('&family=') +
    '&display=swap';

interface EmailEditorProps {
    content?: string;
    onChange?: (html: string) => void;
    onEditorReady?: (setContent: (html: string) => void) => void;
    placeholder?: string;
    className?: string;
}

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
    return (
        <Button
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </Button>
    );
}

export function EmailEditor({ content = '', onChange, onEditorReady, placeholder = 'Write your email content here…', className }: EmailEditorProps) {
    useEffect(() => {
        const id = 'email-editor-google-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = GOOGLE_FONTS_URL;
        document.head.appendChild(link);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Underline,
            FontSize,
            Color,
            FontFamily,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
            Placeholder.configure({ placeholder }),
            EnterAsLineBreak,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'min-h-[400px] px-6 py-4 focus:outline-none',
            },
        },
        onCreate: ({ editor }) => {
            onEditorReady?.((html) => {
                editor.commands.setContent(html);
            });
        },
    });

    const setLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL', prev ?? '');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    }, [editor]);

    if (!editor) return null;

    const activeFontFamily = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? DEFAULT_FONT_VALUE;
    const activeFontSize = editor.getAttributes('textStyle').fontSize as string | undefined;
    const activeFontSizePx = activeFontSize ? activeFontSize.replace('px', '') : '';

    return (
        <div className={cn('bg-background overflow-hidden rounded-lg border', className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
                {/* Font family */}
                <Select
                    value={activeFontFamily}
                    onValueChange={(val) => {
                        editor.chain().focus().setFontFamily(val).run();
                    }}
                >
                    <SelectTrigger className="h-7 w-[152px] text-xs" title="Font family">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FONTS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }} className="text-sm">
                                    {font.label}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Font size */}
                <Select
                    value={activeFontSizePx}
                    onValueChange={(val) => {
                        if (!val) {
                            editor.chain().focus().unsetFontSize().run();
                        } else {
                            editor.chain().focus().setFontSize(`${val}px`).run();
                        }
                    }}
                >
                    <SelectTrigger className="h-7 w-[76px] text-xs" title="Font size">
                        <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>
                                <span className="text-xs">{size} px</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* History */}
                <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                    <Undo className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                    <Redo className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Headings */}
                <ToolbarButton
                    title="Heading 1"
                    active={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                    <Heading1 className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    title="Heading 2"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    title="Heading 3"
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    <Heading3 className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Inline marks */}
                <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Lists */}
                <ToolbarButton
                    title="Bullet list"
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    title="Ordered list"
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Alignment */}
                <ToolbarButton
                    title="Align left"
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                    <AlignLeft className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    title="Align center"
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                    <AlignCenter className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    title="Align right"
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                    <AlignRight className="h-3.5 w-3.5" />
                </ToolbarButton>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Link */}
                <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={setLink}>
                    <Link2 className="h-3.5 w-3.5" />
                </ToolbarButton>
                {editor.isActive('link') && (
                    <ToolbarButton title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
                        <Link2Off className="h-3.5 w-3.5" />
                    </ToolbarButton>
                )}

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Text color */}
                <label className="hover:bg-accent flex h-7 w-7 cursor-pointer items-center justify-center rounded" title="Text color">
                    <span className="text-xs font-bold" style={{ color: editor.getAttributes('textStyle').color ?? 'currentColor' }}>
                        A
                    </span>
                    <input
                        type="color"
                        className="sr-only"
                        value={editor.getAttributes('textStyle').color ?? '#000000'}
                        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    />
                </label>
            </div>

            {/* Editor content */}
            <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground max-w-none [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5"
            />
        </div>
    );
}
