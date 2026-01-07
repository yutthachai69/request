// frontend/src/components/AttachmentsManager.jsx
import React, { useState } from 'react';
import {
    Box, Button, Typography, Chip, Stack, Card, CardHeader, CardContent,
    Avatar, Tooltip, IconButton
} from '@mui/material';

// Icons
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const AttachmentsManager = ({ existingFiles = [], onFilesChange }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files) {
            onFilesChange({ action: 'add', files: Array.from(e.target.files) });
        }
    };

    const handleFileDelete = (file) => {
        onFilesChange({ action: 'delete', file: file });
    };

    const handleDragEvents = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e) => { handleDragEvents(e); setIsDragging(true); };
    const handleDragLeave = (e) => { handleDragEvents(e); setIsDragging(false); };
    const handleDrop = (e) => {
        handleDragEvents(e);
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesChange({ action: 'add', files: Array.from(e.dataTransfer.files) });
            e.dataTransfer.clearData();
        }
    };

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader avatar={<Avatar><AttachFileIcon /></Avatar>} title="ไฟล์แนบ (ถ้ามี)" />
            <CardContent>
                <Box
                    onDrop={handleDrop} onDragOver={handleDragEvents} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                    sx={{
                        border: '2px dashed', borderColor: isDragging ? 'primary.main' : 'grey.300',
                        backgroundColor: isDragging ? 'action.hover' : 'transparent',
                        borderRadius: 2, p: 2, textAlign: 'center', transition: 'all 0.2s',
                    }}
                >
                    <UploadFileIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">ลากไฟล์มาวางที่นี่ หรือ</Typography>
                    <Button component="label" variant="outlined" sx={{ mt: 1 }}>
                        เลือกไฟล์
                        <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" hidden multiple onChange={handleFileChange} />
                    </Button>
                </Box>
                <Box sx={{ mt: 2, maxHeight: 150, overflowY: 'auto' }}>
                    {existingFiles.length > 0 ? (
                        Array.from(existingFiles).map((file) => (
                            <Chip key={typeof file === 'string' ? file : file.name}
                                  label={typeof file === 'string' ? file.split('/').pop() : file.name}
                                  onDelete={() => handleFileDelete(file)}
                                  sx={{ mr: 1, mb: 1 }} />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ pt: 2 }}>ไม่มีไฟล์แนบ</Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default AttachmentsManager;