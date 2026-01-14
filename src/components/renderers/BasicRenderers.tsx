import React from 'react';
import { Text, Button as FluentButton, Input, Dropdown, Option } from '@fluentui/react-components';
import {
    CalendarMonthRegular,
    ImageRegular,
    ChevronLeftRegular,
    ChevronRightRegular,
    DismissRegular,
    CheckmarkRegular,
    ArrowDownloadRegular,
    EditRegular,
    StarRegular
} from '@fluentui/react-icons';

export const DropdownRenderer: React.FC<{ props: any }> = ({ props }) => (
    <Dropdown
        placeholder={props.Default || 'Select...'}
        style={{
            width: '100%',
            height: '100%',
            minWidth: 0, // Override FluentUI default
        }}
        button={{
            style: {
                backgroundColor: props.Fill || 'white',
                border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : '1px solid #ccc',
                color: props.Color || 'black',
            }
        }}
    >
        {/* Placeholder options as we might not have Items yet */}
        <Option>Option 1</Option>
        <Option>Option 2</Option>
    </Dropdown>
);

export const ComboboxRenderer: React.FC<{ props: any }> = ({ props }) => {
    const isDisabled = props.DisplayMode === 'Disabled' || props.DisplayMode === 'View';

    // Simplistic handling of DefaultSelectedItems: assume it might be an array or string
    // Since we don't have real items, we can't really select them, but we can try to show something.
    // Basic styling
    return (
        <div style={{ width: '100%', height: '100%' }} title={props.Tooltip}>
            <Dropdown
                placeholder={props.Default || 'Select...'}
                multiselect={props.SelectMultiple}
                disabled={isDisabled}
                style={{
                    width: '100%',
                    height: '100%',
                    minWidth: 0,
                }}
                button={{
                    style: {
                        backgroundColor: props.Fill || 'white',
                        border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : '1px solid #ccc',
                        color: props.Color || 'black',
                        fontFamily: props.Font,
                        paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined
                    }
                }}
            >
                <Option>Option 1</Option>
                <Option>Option 2</Option>
            </Dropdown>
        </div>
    );
};

export const LabelRenderer: React.FC<{ props: any }> = ({ props }) => (
    <Text
        size={(props.Size ? props.Size * 20 : 400) as any} // Cast to any or match strict Text props
        style={{
            color: props.Color || 'black',
            textAlign: props.Align?.toLowerCase().replace('align.', '') || 'left',
            display: 'block',
            width: '100%',
            height: '100%',
            fontWeight: props.FontWeight?.includes('Bold') ? 'bold' : 'normal',

            // New properties
            backgroundColor: props.Fill || 'transparent',
            paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
            paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
            paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
            paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : undefined,
            cursor: props.OnSelect ? 'pointer' : 'default',
            whiteSpace: props.Wrap ? 'normal' : 'nowrap', // Handle Wrap property
            overflow: props.Wrap ? 'visible' : 'hidden', // Assuming if wrapped we show it, else crop
            textOverflow: props.Wrap ? 'clip' : 'ellipsis'
        }}
        onClick={props.OnSelect ? () => {
            console.log('Label OnSelect triggered');
            if (props._onAction) props._onAction(props.OnSelect);
        } : undefined}
        aria-live={props.Live} // Handle Live property
    >
        {props.Text || ''}
    </Text>
);

export const ButtonRenderer: React.FC<{ props: any }> = ({ props }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    // Determine effective colors
    let effectiveFill = props.Fill;
    if (isPressed && props.PressedFill) effectiveFill = props.PressedFill;
    else if (isHovered && props.HoverFill) effectiveFill = props.HoverFill;

    // Handle transparent fill explicitly for FluentButton appearance
    if (effectiveFill === 'RGBA(0, 0, 0, 0)') effectiveFill = 'transparent';

    let effectiveBorderColor = props.BorderColor;
    if (isPressed && props.PressedBorderColor) effectiveBorderColor = props.PressedBorderColor;
    else if (isHovered && props.HoverBorderColor) effectiveBorderColor = props.HoverBorderColor;

    let effectiveColor = props.Color;
    if (isPressed && props.PressedColor) effectiveColor = props.PressedColor;
    else if (isHovered && props.HoverColor) effectiveColor = props.HoverColor;


    return (
        <FluentButton
            appearance={effectiveFill === 'transparent' ? 'transparent' : 'primary'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onClick={() => {
                if (props.OnSelect && props._onAction) {
                    props._onAction(props.OnSelect);
                }
            }}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: effectiveFill !== 'transparent' ? effectiveFill : undefined,
                color: effectiveColor || undefined,
                border: (props.BorderThickness > 0 && effectiveBorderColor) ? `${props.BorderThickness}px solid ${effectiveBorderColor}` : 'none'
            }}
        >
            {props.Text ?? 'Button'}
        </FluentButton>
    );
};

// ... (previous imports)

// ... (LabelRenderer, ButtonRenderer)

export const TextInputRenderer: React.FC<{ props: any }> = ({ props }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const isDisabled = props.DisplayMode === 'Disabled' || props.DisplayMode === 'View';

    // Calculate disabled styles
    let borderColor = isDisabled ? (props.DisabledBorderColor || props.BorderColor) : props.BorderColor;
    let color = isDisabled ? (props.DisabledColor || props.Color) : props.Color;
    let fill = isDisabled ? (props.DisabledFill || props.Fill) : props.Fill;
    const borderThickness = props.BorderThickness || 1;

    // Apply hover styles if not disabled
    if (!isDisabled && isHovered) {
        if (props.HoverFill) fill = props.HoverFill;
        if (props.HoverBorderColor) borderColor = props.HoverBorderColor;
        // HoverColor if exists?
    }

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ width: '100%', height: '100%' }}
            title={props.Tooltip} // Handle Tooltip
        >
            <Input
                value={props.Default || ''}
                placeholder={props.HintText || ''}
                disabled={isDisabled}
                maxLength={props.MaxLength} // Handle MaxLength
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: fill,
                    color: color,
                    borderColor: borderColor,
                    filter: isDisabled ? 'grayscale(100%)' : undefined,
                    fontFamily: props.Font,
                    borderWidth: borderThickness,

                    // New properties
                    paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
                    borderTopLeftRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : undefined,
                    borderTopRightRadius: props.RadiusTopRight ? `${props.RadiusTopRight}px` : undefined,
                    borderBottomLeftRadius: props.RadiusBottomLeft ? `${props.RadiusBottomLeft}px` : undefined,
                    borderBottomRightRadius: props.RadiusBottomRight ? `${props.RadiusBottomRight}px` : undefined,
                }}
            />
        </div>
    );
};

export const RectangleRenderer: React.FC<{ props: any }> = ({ props }) => (
    <div
        onClick={() => {
            if (props.OnSelect && props._onAction) {
                props._onAction(props.OnSelect);
            }
        }}
        style={{
            width: '100%',
            height: '100%',
            backgroundColor: props.Fill || 'transparent',
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none',
            borderRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : undefined,
            boxShadow: props.DropShadow,
            cursor: props.OnSelect ? 'pointer' : 'default'
        }} />
);

export const GroupContainerRenderer: React.FC<{ props: any; children?: React.ReactNode }> = ({ props, children }) => {
    // Debug logging
    if (props.Variant === 'AutoLayout') {
        console.log('GroupContainer AutoLayout:', props.ControlName, props.Variant);
    }
    return (
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: props.Fill || 'transparent',
            // Support border properties
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none',

            // Support Radius (Assuming uniform or leveraging individual if needed, mimicking Rectangle)
            borderTopLeftRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : undefined,
            borderTopRightRadius: props.RadiusTopRight ? `${props.RadiusTopRight}px` : undefined,
            borderBottomLeftRadius: props.RadiusBottomLeft ? `${props.RadiusBottomLeft}px` : undefined,
            borderBottomRightRadius: props.RadiusBottomRight ? `${props.RadiusBottomRight}px` : undefined,

            // Layout properties
            boxShadow: props.DropShadow,
            overflowY: props.LayoutOverflowY === 'Scroll' ? 'auto' : (props.LayoutOverflowY === 'Hidden' ? 'hidden' : 'visible'),

            // Flex properties for children? 
            // Note: Children are rendered by ControlMapper. 
            // If this is an AutoLayout container, ControlMapper might need to adjust, 
            // but often the renderer just provides the box. 
            // The validator mentioned FillPortions, which is a property on Children usually (flex-grow).
            // If this container is a Flex container, we might want to set display flex.
            display: props.Variant === 'AutoLayout' ? 'flex' : 'block',
            flexDirection: props.LayoutDirection === 'Vertical' ? 'column' : 'row',
            alignItems: props.LayoutAlignItems, // Map 'Stretch', 'Center', etc. if needed
            justifyContent: props.LayoutJustifyContent,
            gap: props.LayoutGap ? `${props.LayoutGap}px` : undefined,

            paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
            paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
            paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
            paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
        }}>
            {children}
        </div>
    );
};

export const ScreenRenderer: React.FC<{ props: any; children?: React.ReactNode }> = ({ props, children }) => (
    <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: props.Fill || 'white',
        backgroundImage: props.BackgroundImage ? `url(${props.BackgroundImage})` : undefined,
        backgroundSize: props.ImagePosition === 'Fill' ? 'cover' : (props.ImagePosition === 'Fit' ? 'contain' : 'auto'),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
    }}
        onClick={() => {
            if (props.OnSelect && props._onAction) {
                props._onAction(props.OnSelect);
            }
        }}
    >
        {children}
    </div>
);

export const CircleRenderer: React.FC<{ props: any }> = ({ props }) => (
    <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: props.Fill || 'transparent',
        border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none',
        borderRadius: '50%'
    }} />
);

// ... (IconRenderer, ImageRenderer)

export const DatePickerRenderer: React.FC<{ props: any }> = ({ props }) => {
    // Handle focus state in real app, here we verify the property is allowed
    // We can use FocusedBorderThickness if we want to simulate it, but static renderer is harder for interaction states without state.
    // We'll just use BorderThickness as default.
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: props.Fill || '#fff',
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none',
            color: props.Color || '#000',
            padding: '0 8px',
            height: '100%',
            boxSizing: 'border-box',
            fontFamily: props.Font,
            fontWeight: props.FontWeight
        }}>
            <Text>{props.DefaultDate || 'Select Date'}</Text>
            <CalendarMonthRegular style={{ marginLeft: 'auto', color: props.IconFill, backgroundColor: props.IconBackground }} />
        </div>
    )
};

// --- New Renderers ---

const ICON_MAP: Record<string, React.FC<any>> = {
    'icon.chevronleft': ChevronLeftRegular,
    'icon.chevronright': ChevronRightRegular,
    'icon.cancel': DismissRegular,
    'icon.check': CheckmarkRegular,
    'icon.download': ArrowDownloadRegular,
    'icon.edit': EditRegular,
    // Add more mappings as needed
};

export const IconRenderer: React.FC<{ props: any }> = ({ props }) => {
    const iconName = props.Icon?.toLowerCase();
    const IconComponent = ICON_MAP[iconName] || StarRegular; // Default to star if unknown

    return (

        <div
            onClick={() => {
                if (props.OnSelect && props._onAction) props._onAction(props.OnSelect);
            }}
            style={{
                color: props.Color || 'inherit',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: props.Rotation ? `rotate(${props.Rotation}deg)` : undefined,
                cursor: props.OnSelect ? 'pointer' : 'default'
            }}>
            <IconComponent style={{ fontSize: props.Height || 20, width: '100%', height: '100%' }} />
        </div>
    );
};

export const ImageRenderer: React.FC<{ props: any }> = ({ props }) => {
    let src = props.Image;
    // Simple cleanup for the complex formula string provided by user
    // e.g. " \"data:image/svg+xml; ... \" & EncodeUrl(...)"
    // We just want to see if we can extract the data uri.
    if (typeof src === 'string' && src.includes('data:image')) {
        const start = src.indexOf('data:image');
        const end = src.indexOf('"', start);
        if (end > start) {
            src = src.substring(start, end);
        } else if (src.includes('&')) {
            // Heuristic: take everything before the first & if it looks like a string
            // But actually user string is: "data... " & EncodeUrl(...)
            // The EncodeUrl part implies the SVG is invalid uri component encoded? 
            // Actually browsers handle data:image/svg+xml;utf-8,<svg...> often without full encoding if simple.
            // But let's try to extract the SVG content if it's there.
            // For now, let's just try to clean quotes.
            // If we can't parse it easily, show placeholder.
        }
    }

    // If it's a complicated formula, show placeholder icon
    if (typeof src === 'string' && src.includes('&')) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                <ImageRegular style={{ fontSize: 24, color: '#999' }} />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt="Control"
            onClick={() => {
                if (props.OnSelect && props._onAction) props._onAction(props.OnSelect);
            }}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: props.Fill || 'transparent',
                paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
                paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
                paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
                paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
                borderTopLeftRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : undefined,
                borderTopRightRadius: props.RadiusTopRight ? `${props.RadiusTopRight}px` : undefined,
                borderBottomLeftRadius: props.RadiusBottomLeft ? `${props.RadiusBottomLeft}px` : undefined,
                borderBottomRightRadius: props.RadiusBottomRight ? `${props.RadiusBottomRight}px` : undefined,
                border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : undefined,
                cursor: props.OnSelect ? 'pointer' : 'default'
            }}
            onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerText = '[Image Error]';
            }}
        />
    );
};



// Basic Container logic for Forms and Cards
export const FormRenderer: React.FC<{ props: any; children?: React.ReactNode }> = ({ props, children }) => (
    <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: props.Fill || 'transparent',
        border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none',
        padding: 10,
        boxSizing: 'border-box',
        overflow: 'auto'
    }}>
        {children}
    </div>
);

export const TypedDataCardRenderer: React.FC<{ props: any; children?: React.ReactNode }> = ({ props, children }) => (
    <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: props.Fill || 'transparent',
        border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : '1px dashed #eee',
        padding: 5,
        boxSizing: 'border-box',
        marginBottom: 5
    }}>
        <strong style={{ fontSize: 10, color: '#666' }}>{props.DisplayName || props.DataField}</strong>
        {children}
    </div>
);

// Minimal Gallery support: Renders the template once (or multiple times if we had real data binding)
export const GalleryRenderer: React.FC<{ props: any }> = ({ props }) => {
    // Gallery has _Children which usually represent the template
    // It also has 'TemplateSize' (height of item)
    // We can simulate a few items.
    const templateHeight = props.TemplateSize || 100;

    // We need to render the children for each item. 
    // BUT, ControlMapper is recursive. 
    // Here we need to manually map children but adjust their Y position?
    // Actually, normally the children are relative to the Template item.
    // Our PositionWrapper handles absolute positioning.

    // NOTE: This file doesn't have access to ControlMapper directly to recurse easily 
    // unless we pass a render function or import it (circular dependency risk).
    // For simplicity in BasicRenderers, let's just render a "Gallery Placeholder" container 
    // and let the Parent (ControlMapper) handle the children recursion IF the structure allows.
    // BUT, the structure is: Gallery -> Children (Template components).
    // If ControlMapper iterates Gallery._Children, it will render them once at their defined X/Y.
    // That renders the "Template". 
    // So usually observing the YAML, the Gallery children are just the controls in the first item.
    // We should probably just let ControlMapper render the children as usual, and wrap them in a container 
    // that represents the "Content" of the gallery. 
    // However, if we want to show multiple items, we need to clone the children.

    // For this previewer, showing just the Template (First Item) is often enough to debug layout.
    // So we treat Gallery as a Container.

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none'
        }}>
            {/* We don't render children here, ControlMapper will render them as children of this component 
               if we render {props.children}. But BasicRenderers are leaf nodes usually. 
               We need to change how ControlMapper handles it. 
               Actually ControlMapper renders {Renderer} then {children}.
               So if we just render a Div, the children (template) will appear inside.
           */}
            <div style={{ position: 'relative', height: templateHeight * 1, width: '100%' }}>
                {/* This is where the children will naturally fall if they are absolute positioned */}
            </div>
            {/* Visual cue that it is a gallery */}
            <div style={{ padding: 4, position: 'absolute', right: 0, top: 0, background: 'rgba(0,0,0,0.1)', fontSize: 10 }}>
                Gallery
            </div>
        </div>
    );
};
