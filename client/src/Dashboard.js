// client/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ onLogout }) => {
    const [topArtists, setTopArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            // Get the token from local storage
            const token = localStorage.getItem('userToken');

            if (!token) {
                // If no token, trigger logout
                if (onLogout) onLogout();
                return;
            }

            try {
                // Make a request to your backend's protected endpoint
                // Use relative URL for production
                const apiUrl = window.location.origin.includes('localhost') 
                    ? 'http://localhost:8888/api/spotify/top-artists'
                    : '/api/spotify/top-artists';
                
                const response = await axios.get(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Attach the token to the request header
                    }
                });

                // Set the fetched data to state
                setTopArtists(response.data.items || []);
                setLoading(false);

            } catch (err) {
                setError("Failed to fetch Spotify data. Please log in again.");
                setLoading(false);
                console.error("Error fetching data:", err.response ? err.response.data : err.message);
                
                // If the token is invalid or expired, log the user out
                if (err.response && err.response.status === 401) {
                    localStorage.removeItem('userToken');
                    if (onLogout) onLogout();
                }
            }
        };

        fetchUserData();
    }, [onLogout]);

    const handleLogout = () => {
        localStorage.removeItem('userToken');
        if (onLogout) onLogout();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-xl">Loading your Spotify data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">Error: {error}</div>
                    <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-green-500 text-black rounded-full hover:bg-green-400"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your Top Artists</h1>
                    <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-green-500 text-black rounded-full hover:bg-green-400 transition-colors"
                    >
                        Log Out
                    </button>
                </div>
                
                {topArtists.length === 0 ? (
                    <div className="text-center text-gray-400">
                        <p>No top artists found. Make sure you've listened to music on Spotify!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topArtists.map((artist, index) => (
                            <div 
                                key={index} 
                                className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 hover:border-green-500 transition-colors"
                            >
                                <div className="text-lg font-semibold text-green-400">
                                    #{index + 1}
                                </div>
                                <div className="text-white text-xl mt-2">{artist}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;