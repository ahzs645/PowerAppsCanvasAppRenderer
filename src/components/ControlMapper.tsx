import React from 'react';
import PositionWrapper from './PositionWrapper';
import { usePowerFx } from '../context/PowerFxContext';
import {
    LabelRenderer,
    ButtonRenderer,
    TextInputRenderer,
    RectangleRenderer,
    IconRenderer,
    ImageRenderer,
    DatePickerRenderer,
    CircleRenderer,
    GroupContainerRenderer,
    DropdownRenderer,
    FormRenderer,
    TypedDataCardRenderer,
    ComboboxRenderer,
    ScreenRenderer,
    ToggleRenderer,
} from './renderers/BasicRenderers';

interface ControlMapperProps {
    control: any;
    highlightedControls?: Set<string>;
    isParentAutoLayout?: boolean;
    parentProps?: any;
    appId?: string | null;
    appImages?: any[];
    onImageUploaded?: (img: any) => void;
    selectedControlName?: string | null;
    onSelectControl?: (name: string) => void;
    onContextMenu?: (e: React.MouseEvent, name: string) => void;
    itemContext?: any;
}

const SKIP_KEYS = new Set(['As', 'ControlName', '_Children', 'Control', '_ControlType', 'Properties', 'Variant']);

const ControlMapper: React.FC<ControlMapperProps> = ({
    control,
    highlightedControls,
    isParentAutoLayout,
    parentProps,
    appId,
    appImages,
    onImageUploaded,
    selectedControlName,
    onSelectControl,
    onContextMenu,
    itemContext,
}) => {
    const { evaluate, execute, registerControl, version } = usePowerFx();

    if (!control || !control.As) return null;
    const type = control.As.toLowerCase();

    // Evaluate all properties (lazy formulas -> values) for this control.
    const evaluatedControl = React.useMemo(() => {
        const result: any = { ...control };

        if (type === 'screen') {
            result.X = result.X ?? 0;
            result.Y = result.Y ?? 0;
            result.Width = result.Width ?? '100%';
            result.Height = result.Height ?? '100%';
        }

        // Galleries: evaluate Items first so Self.AllItems is available to other props.
        let allItems: any;
        if (type === 'gallery' && typeof control.Items === 'string') {
            allItems = evaluate(control.Items, result, parentProps, itemContext);
            result.Items = Array.isArray(allItems) ? allItems : [];
        }
        const selfForEval = type === 'gallery' ? { ...result, AllItems: result.Items } : result;

        const selfRefKeys: string[] = [];
        Object.keys(control).forEach(key => {
            if (SKIP_KEYS.has(key) || key.startsWith('On')) return;
            if (type === 'gallery' && key === 'Items') return;
            const rawValue = control[key];
            if (typeof rawValue === 'string') {
                result[key] = evaluate(rawValue, selfForEval, parentProps, itemContext);
                if (rawValue.includes('Self.')) selfRefKeys.push(key);
            }
        });

        // Second pass: resolve props that referenced Self.<sibling> now that
        // siblings are evaluated.
        if (selfRefKeys.length) {
            const self2 = type === 'gallery' ? { ...result, AllItems: result.Items } : { ...result };
            for (const key of selfRefKeys) {
                result[key] = evaluate(control[key], self2, parentProps, itemContext);
            }
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [control, parentProps, evaluate, itemContext, version]);

    // Register evaluated props + OnSelect handler for cross-control refs / Select().
    React.useEffect(() => {
        registerControl(control.ControlName, evaluatedControl, control.OnSelect);
    }, [control.ControlName, evaluatedControl, registerControl, control.OnSelect]);

    // Fire OnVisible once on mount.
    React.useEffect(() => {
        if (control.OnVisible) execute(control.OnVisible, itemContext, evaluatedControl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Visibility (undefined / blank -> hidden, matching Power Apps).
    if (control.Visible !== undefined) {
        const v = evaluatedControl.Visible;
        if (v === false || v === null || v === undefined || v === '' || v === 0 || v === 'false') return null;
    }

    const isHighlighted = highlightedControls?.has(control.ControlName);

    const positionProps = {
        x: type === 'screen' ? 0 : evaluatedControl.X,
        y: type === 'screen' ? 0 : evaluatedControl.Y,
        width: type === 'screen' ? '100%' : evaluatedControl.Width,
        height: type === 'screen' ? '100%' : evaluatedControl.Height,
        minWidth: evaluatedControl.LayoutMinWidth,
        minHeight: evaluatedControl.LayoutMinHeight,
        fillPortions: evaluatedControl.FillPortions !== undefined ? Number(evaluatedControl.FillPortions) : undefined,
        name: control.ControlName,
        isHighlighted,
        isSelected: selectedControlName === control.ControlName,
        onSelect: onSelectControl,
        onContextMenu,
    };

    const extendedProps = {
        ...evaluatedControl,
        _onAction: execute,
        _itemContext: itemContext,
    };

    const isContainerAutoLayout = control.Variant === 'AutoLayout';

    const childrenNodes = control._Children?.map((child: any, index: number) => (
        <ControlMapper
            key={child.ControlName || index}
            control={child}
            highlightedControls={highlightedControls}
            isParentAutoLayout={isContainerAutoLayout}
            parentProps={evaluatedControl}
            appId={appId}
            appImages={appImages}
            onImageUploaded={onImageUploaded}
            selectedControlName={selectedControlName}
            onSelectControl={onSelectControl}
            onContextMenu={onContextMenu}
            itemContext={itemContext}
        />
    ));

    let Renderer: React.ReactNode = null;

    switch (type) {
        case 'label':
            Renderer = <LabelRenderer props={extendedProps} />;
            break;
        case 'button':
            Renderer = <ButtonRenderer props={extendedProps} />;
            break;
        case 'textinput':
            Renderer = <TextInputRenderer props={extendedProps} />;
            break;
        case 'icon':
            Renderer = <IconRenderer props={extendedProps} />;
            break;
        case 'toggle':
            Renderer = <ToggleRenderer props={extendedProps} />;
            break;
        case 'image':
            Renderer = <ImageRenderer props={extendedProps} appId={appId} appImages={appImages} onUploadSuccess={onImageUploaded} />;
            break;
        case 'gallery': {
            const items: any[] = Array.isArray(evaluatedControl.Items) ? evaluatedControl.Items : [];
            const tmpl = Number(evaluatedControl.TemplateSize) || 100;
            const horizontal = control.Variant === 'Horizontal';
            Renderer = (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex',
                    flexDirection: horizontal ? 'row' : 'column',
                    overflowX: horizontal ? 'auto' : 'hidden',
                    overflowY: horizontal ? 'hidden' : 'auto',
                    backgroundColor: evaluatedControl.Fill || 'transparent',
                }}>
                    {items.map((item, i) => (
                        <div key={i} style={{
                            position: 'relative',
                            flex: '0 0 auto',
                            width: horizontal ? tmpl : '100%',
                            height: horizontal ? '100%' : tmpl,
                        }}>
                            {control._Children?.map((child: any, j: number) => (
                                <ControlMapper
                                    key={child.ControlName || j}
                                    control={child}
                                    highlightedControls={highlightedControls}
                                    isParentAutoLayout={false}
                                    parentProps={evaluatedControl}
                                    itemContext={item}
                                    appId={appId}
                                    appImages={appImages}
                                    onImageUploaded={onImageUploaded}
                                    selectedControlName={selectedControlName}
                                    onSelectControl={onSelectControl}
                                    onContextMenu={onContextMenu}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            );
            break;
        }
        case 'datepicker':
            Renderer = <DatePickerRenderer props={extendedProps} />;
            break;
        case 'rectangle':
            Renderer = <RectangleRenderer props={extendedProps} />;
            break;
        case 'groupcontainer':
            Renderer = <GroupContainerRenderer props={extendedProps}>{childrenNodes}</GroupContainerRenderer>;
            break;
        case 'dropdown':
            Renderer = <DropdownRenderer props={extendedProps} />;
            break;
        case 'combobox':
            Renderer = <ComboboxRenderer props={extendedProps} />;
            break;
        case 'form':
            Renderer = <FormRenderer props={extendedProps}>{childrenNodes}</FormRenderer>;
            break;
        case 'typeddatacard':
            Renderer = <TypedDataCardRenderer props={extendedProps}>{childrenNodes}</TypedDataCardRenderer>;
            break;
        case 'screen':
            Renderer = <ScreenRenderer props={extendedProps}>{childrenNodes}</ScreenRenderer>;
            break;
        case 'circle':
            Renderer = <CircleRenderer props={extendedProps} />;
            break;
        case 'text':
            Renderer = <LabelRenderer props={extendedProps} />;
            break;
        case 'canvascomponent':
            Renderer = (
                <div style={{ width: '100%', height: '100%', backgroundColor: extendedProps.Fill || 'transparent', position: 'relative', overflow: 'hidden' }}>
                    {childrenNodes}
                </div>
            );
            break;
        default:
            Renderer = (
                <div style={{ border: '1px dashed #ccc', width: '100%', height: '100%', fontSize: '10px', color: '#999', overflow: 'hidden' }}>
                    {control._ControlType || type}
                    {childrenNodes}
                </div>
            );
    }

    return (
        <PositionWrapper {...positionProps} isParentAutoLayout={isParentAutoLayout}>
            {Renderer}
        </PositionWrapper>
    );
};

export default ControlMapper;
