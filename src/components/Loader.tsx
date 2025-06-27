import React from 'react';
import { Loader as MantineLoader } from '@mantine/core';
import '../css/Loader.css';

interface LoaderProps {
    message?: string;
    size?: number;
    isVisible?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
    message = "Loading...",
    size = 40,
    isVisible = true
}) => {
    if (!isVisible) return null;

    return (
        <div className="custom-loader-overlay">
            <div className="custom-loader-container">
                <MantineLoader size={size} />
                <span className="custom-loader-message">
                    {message}
                </span>
            </div>
        </div>
    );
};

export default Loader;