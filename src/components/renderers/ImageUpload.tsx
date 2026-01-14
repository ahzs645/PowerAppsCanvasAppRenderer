import React, { useCallback, useState } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { ArrowUploadRegular } from '@fluentui/react-icons';
import { uploadAppImage } from '../../lib/database';

interface ImageUploadProps {
    appId: string;
    controlName: string;
    imageName: string;
    onUploadSuccess: (url: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ appId, controlName, imageName, onUploadSuccess }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (isUploading) return;

        setIsUploading(true);
        try {
            const result = await uploadAppImage(appId, imageName, file);
            if (result) {
                onUploadSuccess(result.url);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleUpload(file);
        }
    }, [appId, imageName]);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => document.getElementById(`file-upload-${controlName}`)?.click()}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDragging ? '2px dashed #0078d4' : '1px dashed #ccc',
                backgroundColor: isDragging ? 'rgba(0, 120, 212, 0.05)' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                gap: '8px',
                padding: '12px',
                boxSizing: 'border-box',
                textAlign: 'center'
            }}
        >
            <input
                id={`file-upload-${controlName}`}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                }}
            />
            {isUploading ? (
                <Spinner size="small" label="Uploading..." />
            ) : (
                <>
                    <ArrowUploadRegular style={{ fontSize: 24, color: '#0078d4' }} />
                    <Text size={100} weight="semibold" style={{ color: '#666' }}>
                        Click or Drop to upload <br /> <strong>{imageName}</strong>
                    </Text>
                </>
            )}
        </div>
    );
};
