import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
    return (
        <Sonner
            closeButton
            theme="system"
            className="toaster group"
            {...props}
        />
    );
}
