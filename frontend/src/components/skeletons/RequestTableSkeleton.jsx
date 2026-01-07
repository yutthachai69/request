// frontend/src/components/skeletons/RequestTableSkeleton.jsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
} from '@mui/material';

const SkeletonRow = () => (
  <TableRow>
    <TableCell><Skeleton variant="text" width={40} animation="wave" /></TableCell>
    <TableCell><Skeleton variant="text" width={100} animation="wave" /></TableCell>
    <TableCell><Skeleton variant="text" width={120} animation="wave" /></TableCell>
    <TableCell><Skeleton variant="text" width={80} animation="wave" /></TableCell>
    <TableCell><Skeleton variant="rounded" width={120} height={24} animation="wave" /></TableCell>
    <TableCell align="center"><Skeleton variant="circular" width={32} height={32} animation="wave" /></TableCell>
  </TableRow>
);

const RequestTableSkeleton = () => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell><Skeleton variant="text" width={30} animation="wave" /></TableCell>
            <TableCell><Skeleton variant="text" width={80} animation="wave" /></TableCell>
            <TableCell><Skeleton variant="text" width={60} animation="wave" /></TableCell>
            <TableCell><Skeleton variant="text" width={70} animation="wave" /></TableCell>
            <TableCell><Skeleton variant="text" width={50} animation="wave" /></TableCell>
            <TableCell><Skeleton variant="text" width={60} animation="wave" /></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RequestTableSkeleton;