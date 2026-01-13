import React from 'react';
import { Text, Button as FluentButton, Input } from '@fluentui/react-components';

export const LabelRenderer: React.FC<{ props: any }> = ({ props }) => (
    <Text
        size={props.Size ? props.Size * 20 : 400} // Rough mapping
        style={{
            color: props.Color || 'inherit',
            textAlign: props.Align?.toLowerCase() || 'left',
            display: 'block',
            width: '100%',
            height: '100%'
        }}
    >
        {props.Text || ''}
    </Text>
);

export const ButtonRenderer: React.FC<{ props: any }> = ({ props }) => (
    <FluentButton
        appearance="primary"
        style={{ width: '100%', height: '100%' }}
    >
        {props.Text || 'Button'}
    </FluentButton>
);

export const TextInputRenderer: React.FC<{ props: any }> = ({ props }) => (
    <Input
        value={props.Default || ''}
        placeholder={props.HintText || ''}
        style={{ width: '100%', height: '100%' }}
    />
);

export const RectangleRenderer: React.FC<{ props: any }> = ({ props }) => (
    <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: props.Fill || 'transparent',
        border: props.BorderColor ? `1px solid ${props.BorderColor}` : 'none'
    }} />
);
