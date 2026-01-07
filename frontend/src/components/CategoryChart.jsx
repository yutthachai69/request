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
        backgroundColor: 'rgba(25, 118, 210, 0.6)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y', // ทำให้เป็นกราฟแนวนอน
    elements: {
      bar: {
        borderWidth: 2,
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