// frontend/src/components/LocationBreakdownChart.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const LocationBreakdownChart = ({ chartData }) => {
    const theme = useTheme();
    const data = {
        labels: chartData.map(d => d.LocationName),
        datasets: [{
            label: 'จำนวนคำร้อง',
            data: chartData.map(d => d.count),
            backgroundColor: theme.palette.primary.light,
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
        }]
    };
    const options = {
        indexAxis: 'y',
        responsive: true,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
            }
        }
    };
    return <Bar data={data} options={options} />;
};

export default LocationBreakdownChart;