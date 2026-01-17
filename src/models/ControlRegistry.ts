import { BaseControl } from './BaseControl';
import type { PropertyMetadata } from './BaseControl';

const COMMON_PROPS: PropertyMetadata[] = [
    { name: 'X', type: 'number', defaultValue: 0 },
    { name: 'Y', type: 'number', defaultValue: 0 },
    { name: 'Width', type: 'number', defaultValue: 100 },
    { name: 'Height', type: 'number', defaultValue: 40 },
    { name: 'Visible', type: 'boolean', defaultValue: true },
    { name: 'Variant', type: 'string', defaultValue: 'default' },
    { name: 'Fill', type: 'color', defaultValue: 'Transparent' },
    { name: 'BorderColor', type: 'color', defaultValue: 'Transparent' },
    { name: 'BorderThickness', type: 'number', defaultValue: 0 },
];

class ScreenControl extends BaseControl {
    readonly type = 'screen';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'BackgroundImage', type: 'string' },
        { name: 'ImagePosition', type: 'enum', options: ['Fill', 'Fit', 'Stretch', 'Tile', 'Center'] },
        { name: 'OnVisible', type: 'string' },
        { name: 'LoadingSpinnerColor', type: 'color' },
    ];
}

class LabelControl extends BaseControl {
    readonly type = 'label';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Text', type: 'string', defaultValue: 'Text' },
        { name: 'Size', type: 'number', defaultValue: 12 },
        { name: 'Color', type: 'color', defaultValue: 'Black' },
        { name: 'Align', type: 'enum', options: ['Left', 'Center', 'Right', 'Justify'] },
        { name: 'Font', type: 'string', defaultValue: 'Arial' },
        { name: 'FontWeight', type: 'enum', options: ['Normal', 'Bold', 'Semibold', 'Lighter'] },
    ];
}

class ButtonControl extends BaseControl {
    readonly type = 'button';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Text', type: 'string', defaultValue: 'Button' },
        { name: 'OnSelect', type: 'string' },
        { name: 'HoverFill', type: 'color' },
        { name: 'PressedFill', type: 'color' },
        { name: 'Align', type: 'enum', options: ['Left', 'Center', 'Right', 'Justify'] },
        { name: 'Color', type: 'color' },
        { name: 'DisabledBorderColor', type: 'color' },
        { name: 'DisabledColor', type: 'color' },
        { name: 'DisabledFill', type: 'color' },
        { name: 'FocusedBorderColor', type: 'color' },
        { name: 'Font', type: 'string' },
        { name: 'HoverBorderColor', type: 'color' },
        { name: 'HoverColor', type: 'color' },
        { name: 'PaddingRight', type: 'number' },
        { name: 'PressedBorderColor', type: 'color' },
        { name: 'PressedColor', type: 'color' },
        { name: 'RadiusBottomLeft', type: 'number' },
        { name: 'RadiusBottomRight', type: 'number' },
        { name: 'RadiusTopLeft', type: 'number' },
        { name: 'RadiusTopRight', type: 'number' },
        { name: 'Size', type: 'number' },
    ];
}

class GroupContainerControl extends BaseControl {
    readonly type = 'groupcontainer';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'LayoutDirection', type: 'enum', options: ['Vertical', 'Horizontal'] },
        { name: 'LayoutGap', type: 'number', defaultValue: 0 },
        { name: 'LayoutJustifyContent', type: 'enum', options: ['Start', 'Center', 'End', 'SpaceBetween'] },
        { name: 'LayoutAlignItems', type: 'enum', options: ['Start', 'Center', 'End', 'Stretch'] },
        { name: 'DropShadow', type: 'string' },
        { name: 'RadiusBottomLeft', type: 'number' },
        { name: 'RadiusBottomRight', type: 'number' },
        { name: 'RadiusTopLeft', type: 'number' },
        { name: 'RadiusTopRight', type: 'number' },
        { name: 'PaddingBottom', type: 'number' },
        { name: 'PaddingTop', type: 'number' },
        { name: 'LayoutMinHeight', type: 'number' },
        { name: 'LayoutMinWidth', type: 'number' },
        { name: 'LayoutMaxHeight', type: 'number' },
        { name: 'LayoutMaxWidth', type: 'number' },
    ];
}

class TextInputControl extends BaseControl {
    readonly type = 'textinput';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Default', type: 'string' },
        { name: 'HintText', type: 'string' },
        { name: 'Mode', type: 'enum', options: ['SingleLine', 'Multiline', 'Password'] },
    ];
}

class IconControl extends BaseControl {
    readonly type = 'icon';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Icon', type: 'string' },
        { name: 'Color', type: 'color' },
        { name: 'Rotation', type: 'number' },
    ];
}

class ImageControl extends BaseControl {
    readonly type = 'image';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Image', type: 'string' },
        { name: 'DisabledFill', type: 'color' },
        { name: 'HoverFill', type: 'color' },
        { name: 'PressedFill', type: 'color' },
        { name: 'OnSelect', type: 'string' },
    ];
}

class GalleryControl extends BaseControl {
    readonly type = 'gallery';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Items', type: 'string' },
        { name: 'TemplateSize', type: 'number' },
    ];
}

class DatePickerControl extends BaseControl {
    readonly type = 'datepicker';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'DefaultDate', type: 'string' },
        { name: 'Color', type: 'color' },
        { name: 'DisabledBorderColor', type: 'color' },
        { name: 'DisabledColor', type: 'color' },
        { name: 'FocusedBorderColor', type: 'color' },
        { name: 'Font', type: 'string' },
        { name: 'FontWeight', type: 'string' },
        { name: 'IconBackground', type: 'color' },
        { name: 'IconFill', type: 'color' },
        { name: 'OnChange', type: 'string' },
    ];
}

class CircleControl extends BaseControl {
    readonly type = 'circle';
    readonly version = '1.0';
    readonly properties = [...COMMON_PROPS];
}

class DropdownControl extends BaseControl {
    readonly type = 'dropdown';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Items', type: 'string' },
        { name: 'Default', type: 'string' },
    ];
}

class ComboBoxControl extends BaseControl {
    readonly type = 'combobox';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'Items', type: 'string' },
        { name: 'SelectMultiple', type: 'boolean' },
        { name: 'IsSearchable', type: 'boolean' },
    ];
}

class FormControl extends BaseControl {
    readonly type = 'form';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'DataSource', type: 'string' },
        { name: 'Item', type: 'string' },
    ];
}

class TypedDataCardControl extends BaseControl {
    readonly type = 'typeddatacard';
    readonly version = '1.0';
    readonly properties: PropertyMetadata[] = [
        ...COMMON_PROPS,
        { name: 'DataField', type: 'string' },
        { name: 'DisplayName', type: 'string' },
    ];
}

class CanvasComponentControl extends BaseControl {
    readonly type = 'canvascomponent';
    readonly version = '1.0';
    readonly properties = [...COMMON_PROPS];
}

// Registry
const instances: Record<string, BaseControl> = {
    'screen': new ScreenControl(),
    'label': new LabelControl(),
    'text': new LabelControl(), // Treat 'text' same as 'label' for now
    'button': new ButtonControl(),
    'textinput': new TextInputControl(),
    'rectangle': new CircleControl(), // Reuse circle for basic props
    'groupcontainer': new GroupContainerControl(),
    'icon': new IconControl(),
    'image': new ImageControl(),
    'gallery': new GalleryControl(),
    'datepicker': new DatePickerControl(),
    'circle': new CircleControl(),
    'dropdown': new DropdownControl(),
    'combobox': new ComboBoxControl(),
    'form': new FormControl(),
    'typeddatacard': new TypedDataCardControl(),
    'canvascomponent': new CanvasComponentControl(),
};

export const getControlSchema = (type: string): BaseControl | undefined => {
    return instances[type.toLowerCase()];
};

export const getAllSchemas = () => instances;
