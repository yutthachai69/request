// src/components/RequestStatusChart.jsx
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Box, Typography, useTheme } from '@mui/material';

ChartJS.register(ArcElement, Tooltip, Legend);

const RequestStatusChart = ({ data }) => {
    const theme = useTheme();

    const chartData = {
        labels: Object.keys(data),
        datasets: [
            {
                label: '# of Requests',
                data: Object.values(data),
                backgroundColor: [
                    theme.palette.warning.light,
                    theme.palette.info.light,
                    theme.palette.secondary.light,
                    theme.palette.error.light,
                    theme.palette.success.light,
                ],
                borderColor: [
                    theme.palette.warning.main,
                    theme.palette.info.main,
                    theme.palette.secondary.main,
                    theme.palette.error.main,
                    theme.palette.success.main,
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: 'Request Status Overview',
                font: {
                    size: 16
                }
            },
        },
    };

    return (
        <Box sx={{ height: '350px', p: 2 }}>
            <Doughnut data={chartData} options={options} />
        </Box>
    );
};

export default RequestStatusChart;