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
            backgroundColor: [
                'rgba(0, 188, 212, 0.7)',
                'rgba(25, 118, 210, 0.7)',
                'rgba(156, 39, 176, 0.7)',
                'rgba(76, 175, 80, 0.7)',
                'rgba(255, 152, 0, 0.7)',
                'rgba(233, 30, 99, 0.7)',
            ],
            borderColor: [
                'rgba(0, 188, 212, 1)',
                'rgba(25, 118, 210, 1)',
                'rgba(156, 39, 176, 1)',
                'rgba(76, 175, 80, 1)',
                'rgba(255, 152, 0, 1)',
                'rgba(233, 30, 99, 1)',
            ],
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
        }]
    };
    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            bar: {
                borderWidth: 2,
                borderRadius: 6,
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { 
                    stepSize: 1,
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                }
            },
            y: {
                ticks: {
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                }
            }
        }
    };
    return <Bar data={data} options={options} />;
};

export default LocationBreakdownChart;