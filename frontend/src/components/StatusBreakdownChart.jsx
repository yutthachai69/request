// frontend/src/components/StatusBreakdownChart.jsx
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatusBreakdownChart = ({ chartData }) => {
    const theme = useTheme();
    const data = {
        labels: chartData.map(d => d.StatusName),
        datasets: [{
            label: 'จำนวนคำร้อง',
            data: chartData.map(d => d.count),
            backgroundColor: [
                theme.palette.success.light,
                theme.palette.warning.light,
                theme.palette.info.light,
                theme.palette.error.light,
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)'
            ],
            borderColor: [
                theme.palette.success.main,
                theme.palette.warning.main,
                theme.palette.info.main,
                theme.palette.error.main,
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1,
        }]
    };
    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        }
    };
    return <Doughnut data={data} options={options} />;
};

export default StatusBreakdownChart;