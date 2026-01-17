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
    StarRegular,
    // PowerApps Icons
    SearchRegular,
    AddRegular,
    DeleteRegular,
    SaveRegular,
    PersonRegular,
} from '@fluentui/react-icons';
import { ImageUpload } from './ImageUpload';

const ICON_MAP: Record<string, React.FC<any>> = {
    'icon.chevronleft': ChevronLeftRegular,
    'icon.chevronright': ChevronRightRegular,
    'icon.cancel': DismissRegular,
    'icon.check': CheckmarkRegular,
    'icon.download': ArrowDownloadRegular,
    'icon.edit': EditRegular,
    'icon.add': AddRegular,
    'icon.delete': DeleteRegular,
    'icon.save': SaveRegular,
    'icon.search': SearchRegular,
    'icon.person': PersonRegular,
    // Add more mappings as needed
};

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

export const LabelRenderer: React.FC<{ props: any }> = ({ props }) => {
    const verticalAlign = props.VerticalAlign?.toLowerCase().replace('verticalalign.', '') || 'middle';
    const justifyContent = verticalAlign === 'top' ? 'flex-start' : (verticalAlign === 'bottom' ? 'flex-end' : 'center');

    const textAlign = props.Align?.toLowerCase().replace('align.', '') || 'left';
    const alignItems = textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start');

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: justifyContent,
                alignItems: alignItems,
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                backgroundColor: props.Fill || 'transparent',
                paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
                paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
                paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
                paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
                border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : undefined,
                borderRadius: props.BorderRadius ? `${props.BorderRadius}px` : undefined,
                cursor: props.OnSelect ? 'pointer' : 'default',
            }}
            onClick={props.OnSelect ? () => {
                if (props._onAction) props._onAction(props.OnSelect);
            } : undefined}
        >
            <Text
                size={(props.Size ? props.Size * 20 : 400) as any}
                style={{
                    color: props.FontColor || props.Color || 'black',
                    textAlign: textAlign as any,
                    fontWeight: (props.Weight || props.FontWeight)?.includes('Bold') ? 'bold' : 'normal',
                    whiteSpace: props.Wrap ? 'normal' : 'nowrap',
                    textOverflow: props.Wrap ? 'clip' : 'ellipsis',
                    width: textAlign === 'left' ? 'auto' : '100%',
                }}
                aria-live={props.Live}
            >
                {props.Text || ''}
            </Text>
        </div>
    );
};

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


    const iconName = props.Icon?.toLowerCase();
    const IconComponent = iconName ? (ICON_MAP[iconName] || ICON_MAP[iconName.replace('icon.', '')] || StarRegular) : null;

    const fontSize = props.FontSize || (props.Size ? props.Size * 2 : 14);
    const fontWeight = (props.Weight || props.FontWeight)?.toLowerCase().includes('bold') ? 'bold' : ((props.Weight || props.FontWeight)?.toLowerCase().includes('semibold') ? '600' : 'normal');

    // Appearance mapping
    const appearance = props.Appearance?.toLowerCase().includes('subtle') ? 'subtle' :
        (props.Appearance?.toLowerCase().includes('outline') ? 'outline' :
            (props.Appearance?.toLowerCase().includes('transparent') ? 'transparent' :
                (props.Appearance?.toLowerCase().includes('primary') ? 'primary' :
                    (effectiveFill === 'transparent' ? 'transparent' : 'primary'))));

    const isDisabled = props.DisplayMode === 'Disabled' || props.DisplayMode === 'View';

    return (
        <FluentButton
            appearance={appearance as any}
            disabled={isDisabled}
            onMouseEnter={() => !isDisabled && setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => !isDisabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            icon={IconComponent ? <IconComponent /> : undefined}
            onClick={() => {
                if (props.OnSelect && props._onAction && !isDisabled) {
                    props._onAction(props.OnSelect);
                }
            }}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: !isDisabled ? (effectiveFill !== 'transparent' ? effectiveFill : undefined) : props.DisabledFill,
                color: !isDisabled ? (effectiveColor || undefined) : props.DisabledColor,
                border: (props.BorderThickness > 0 && effectiveBorderColor) ? `${props.BorderThickness}px solid ${isDisabled ? props.DisabledBorderColor || effectiveBorderColor : effectiveBorderColor}` : 'none',
                fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
                fontWeight: fontWeight as any,
                fontFamily: props.Font,
                borderTopLeftRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : (props.BorderRadius ? `${props.BorderRadius}px` : undefined),
                borderTopRightRadius: props.RadiusTopRight ? `${props.RadiusTopRight}px` : (props.BorderRadius ? `${props.BorderRadius}px` : undefined),
                borderBottomLeftRadius: props.RadiusBottomLeft ? `${props.RadiusBottomLeft}px` : (props.BorderRadius ? `${props.BorderRadius}px` : undefined),
                borderBottomRightRadius: props.RadiusBottomRight ? `${props.RadiusBottomRight}px` : (props.BorderRadius ? `${props.BorderRadius}px` : undefined),
                display: 'flex',
                alignItems: props.VerticalAlign?.toLowerCase().includes('bottom') ? 'flex-end' : (props.VerticalAlign?.toLowerCase().includes('top') ? 'flex-start' : 'center'),
                justifyContent: props.Align?.toLowerCase().includes('right') ? 'flex-end' : (props.Align?.toLowerCase().includes('left') ? 'flex-start' : 'center'),
                paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
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
        // console.log('GroupContainer AutoLayout:', props.ControlName, props.Variant);
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

            // Flex properties for children
            display: props.Variant === 'AutoLayout' ? 'flex' : 'block',
            flexDirection: (props.LayoutDirection?.toLowerCase().includes('vertical') ? 'column' : 'row') as any,
            alignItems: (props.LayoutAlignItems?.toLowerCase().includes('center') ? 'center' :
                (props.LayoutAlignItems?.toLowerCase().includes('stretch') ? 'stretch' :
                    (props.LayoutAlignItems?.toLowerCase().includes('start') ? 'flex-start' :
                        (props.LayoutAlignItems?.toLowerCase().includes('end') ? 'flex-end' : undefined)))) as any,
            justifyContent: (props.LayoutJustifyContent?.toLowerCase().includes('center') ? 'center' :
                (props.LayoutJustifyContent?.toLowerCase().includes('start') ? 'flex-start' :
                    (props.LayoutJustifyContent?.toLowerCase().includes('end') ? 'flex-end' :
                        (props.LayoutJustifyContent?.toLowerCase().includes('spacebetween') ? 'space-between' : undefined)))) as any,
            gap: props.LayoutGap ? (typeof props.LayoutGap === 'number' ? `${props.LayoutGap}px` : props.LayoutGap) : undefined,

            paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
            paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
            paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
            paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
            flexWrap: props.LayoutWrap ? 'wrap' : 'nowrap',
            overflow: props.LayoutOverflowY === 'Scroll' ? 'auto' : 'hidden', // Default to hidden for containers
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
        overflow: 'hidden',
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
    const isDisabled = props.DisplayMode === 'Disabled' || props.DisplayMode === 'View';

    return (
        <div
            onClick={() => {
                if (props.OnChange && props._onAction && !isDisabled) {
                    props._onAction(props.OnChange);
                }
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isDisabled ? props.DisabledFill || props.Fill || '#f3f2f1' : props.Fill || '#fff',
                border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${isDisabled ? props.DisabledBorderColor || props.BorderColor : props.BorderColor}` : 'none',
                color: isDisabled ? props.DisabledColor || props.Color || '#a19f9d' : props.Color || '#000',
                padding: '0 8px',
                height: '100%',
                boxSizing: 'border-box',
                fontFamily: props.Font,
                fontWeight: props.FontWeight,
                opacity: isDisabled ? 0.8 : 1
            }}>
            <Text style={{ color: 'inherit', fontWeight: 'inherit' }}>{props.DefaultDate || 'Select Date'}</Text>
            <CalendarMonthRegular style={{ marginLeft: 'auto', color: props.IconFill, backgroundColor: props.IconBackground }} />
        </div>
    )
};

// --- New Renderers ---



export const IconRenderer: React.FC<{ props: any }> = ({ props }) => {
    const iconName = props.Icon?.toLowerCase();
    const IconComponent = ICON_MAP[iconName] || ICON_MAP[iconName?.replace('icon.', '')] || StarRegular; // Default to star if unknown

    return (

        <div
            onClick={() => {
                if (props.OnSelect && props._onAction) props._onAction(props.OnSelect);
            }}
            title={props.Tooltip}
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



export const ImageRenderer: React.FC<{
    props: any;
    appId?: string | null;
    appImages?: any[];
    onUploadSuccess?: (img: any) => void
}> = ({ props, appId, appImages, onUploadSuccess }) => {
    const [hasError, setHasError] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);
    let src = props.Image;
    const imageName = typeof src === 'string' ? src : props.ControlName;

    // Resolve named images from appImages
    if (typeof src === 'string' && appImages) {
        const syncedImage = appImages.find(img => img.name === src);
        if (syncedImage) {
            src = syncedImage.url;
        }
    }

    // Simple cleanup for the complex formula string provided by user
    if (typeof src === 'string' && src.includes('data:image')) {
        // If it starts with data: but has trailing quotes or junk from a raw formula pick, clean it.
        // However, we should be careful NOT to truncate if it's a valid complex URI.
        const start = src.indexOf('data:image');
        if (start !== -1) {
            let possibleSrc = src.substring(start);
            // If it ends with a quote that was part of a larger formula string
            if (possibleSrc.includes('"')) {
                const end = possibleSrc.indexOf('"');
                src = possibleSrc.substring(0, end);
            } else {
                src = possibleSrc;
            }
        }
    }

    // If no source and we have appId, show upload dropbox
    // But ONLY if it's not a formula result (like raw SVG content)
    const isSvgContent = typeof src === 'string' && src.trim().startsWith('<svg');
    const isFormula = typeof src === 'string' && (src.includes('&') || src.includes('('));
    const isDataUri = typeof src === 'string' && src.startsWith('data:');

    if ((!src || src === imageName) && !isSvgContent && appId) {
        return (
            <ImageUpload
                appId={appId}
                controlName={props.ControlName}
                imageName={imageName}
                onUploadSuccess={(url) => {
                    if (onUploadSuccess) onUploadSuccess({ name: imageName, url });
                }}
            />
        );
    }

    if (isSvgContent) {
        return (
            <div
                onClick={() => {
                    if (props.OnSelect && props._onAction) props._onAction(props.OnSelect);
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: props.Fill || 'transparent',
                    paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
                    paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
                    paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
                    paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
                    border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : undefined,
                    cursor: props.OnSelect ? 'pointer' : 'default',
                    overflow: 'hidden'
                }}
                dangerouslySetInnerHTML={{ __html: src }}
            />
        );
    }

    if (isFormula && !isDataUri) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                <ImageRegular style={{ fontSize: 24, color: '#999' }} />
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,0,0,0.05)',
                border: '1px solid rgba(255,0,0,0.2)',
                fontSize: '10px',
                color: '#d13438'
            }}>
                [Image Error]
            </div>
        );
    }

    const isDisabled = props.DisplayMode === 'Disabled' || props.DisplayMode === 'View';

    let effectiveFill = props.Fill || 'transparent';
    if (isDisabled) effectiveFill = props.DisabledFill || effectiveFill;
    else if (isPressed && props.PressedFill) effectiveFill = props.PressedFill;
    else if (isHovered && props.HoverFill) effectiveFill = props.HoverFill;

    return (
        <img
            src={src}
            alt={imageName || "Control"}
            onMouseEnter={() => !isDisabled && setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => !isDisabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onClick={() => {
                if (props.OnSelect && props._onAction && !isDisabled) props._onAction(props.OnSelect);
            }}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: effectiveFill,
                paddingTop: props.PaddingTop ? `${props.PaddingTop}px` : undefined,
                paddingRight: props.PaddingRight ? `${props.PaddingRight}px` : undefined,
                paddingBottom: props.PaddingBottom ? `${props.PaddingBottom}px` : undefined,
                paddingLeft: props.PaddingLeft ? `${props.PaddingLeft}px` : undefined,
                borderTopLeftRadius: props.RadiusTopLeft ? `${props.RadiusTopLeft}px` : undefined,
                borderTopRightRadius: props.RadiusTopRight ? `${props.RadiusTopRight}px` : undefined,
                borderBottomLeftRadius: props.RadiusBottomLeft ? `${props.RadiusBottomLeft}px` : undefined,
                borderBottomRightRadius: props.RadiusBottomRight ? `${props.RadiusBottomRight}px` : undefined,
                border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : undefined,
                cursor: props.OnSelect && !isDisabled ? 'pointer' : 'default',
                opacity: isDisabled ? 0.7 : 1
            }}
            onError={() => {
                setHasError(true);
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
export const GalleryRenderer: React.FC<{ props: any; children?: React.ReactNode }> = ({ props, children }) => {
    // Gallery has _Children which usually represent the template
    // It also has 'TemplateSize' (height of item)
    // We can simulate a few items.

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
            backgroundColor: props.Fill || 'transparent',
            border: (props.BorderThickness > 0 && props.BorderColor) ? `${props.BorderThickness}px solid ${props.BorderColor}` : 'none'
        }}>
            {children}
            {/* Visual cue that it is a gallery */}
            <div style={{ padding: 4, position: 'absolute', right: 0, top: 0, background: 'rgba(0,0,0,0.1)', fontSize: 10, pointerEvents: 'none' }}>
                Gallery
            </div>
        </div>
    );
};
