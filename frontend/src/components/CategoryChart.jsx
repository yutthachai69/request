// frontend/src/components/CategoryChart.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Box } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CategoryChart = ({ chartData }) => {
  const data = {
    labels: chartData.map(d => d.CategoryName),
    datasets: [
      {
        label: 'จำนวนคำร้อง',
        data: chartData.map(d => d.requestCount),
        backgroundColor: [
          'rgba(25, 118, 210, 0.7)',
          'rgba(156, 39, 176, 0.7)',
          'rgba(0, 188, 212, 0.7)',
          'rgba(76, 175, 80, 0.7)',
          'rgba(255, 152, 0, 0.7)',
          'rgba(233, 30, 99, 0.7)',
        ],
        borderColor: [
          'rgba(25, 118, 210, 1)',
          'rgba(156, 39, 176, 1)',
          'rgba(0, 188, 212, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(233, 30, 99, 1)',
        ],
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    indexAxis: 'y', // ทำให้เป็นกราฟแนวนอน
    elements: {
      bar: {
        borderWidth: 2,
        borderRadius: 6,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'ปริมาณคำร้องแยกตามหมวดหมู่',
        font: {
            size: 16,
            family: "'Noto Sans Thai', sans-serif",
        }
      },
    },
    scales: {
        x: {
            beginAtZero: true,
            ticks: {
                stepSize: 1
            }
        }
    }
  };

  return (
    <Box sx={{ height: '100%', minHeight: '300px' }}>
        <Bar options={options} data={data} />
    </Box>
  );
};

export default CategoryChart;