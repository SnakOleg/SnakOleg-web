import { ComponentType, SVGProps, lazy, Suspense } from "react";
import * as LucideIcons from "lucide-react";

type IconName = keyof typeof LucideIcons;

interface IconProps extends SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number;
    className?: string;
}

export const Icon = ({ name, size = 24, className, ...props }: IconProps) => {
    const LucideIcon = lazy(() =>
        import("lucide-react").then((mod) => ({
            default: mod[name] as ComponentType<SVGProps<SVGSVGElement>>,
        })),
    );

    return (
        <Suspense fallback={<div style={{ width: size, height: size }} />}>
            <LucideIcon
                width={size}
                height={size}
                className={`icon ${className}`}
                {...props}
            />
        </Suspense>
    );
};