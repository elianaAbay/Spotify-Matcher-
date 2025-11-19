// client/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [topArtists, setTopArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            // Get the token from local storage
            const token = localStorage.getItem('userToken');

            if (!token) {
                // If no token, redirect to login page
                navigate('/login');
                return;
            }

            try {
                // Step 2: Make a request to your backend's protected endpoint
                // We'll create this endpoint in the next phase
                const response = await axios.get('http://localhost:5000/api/spotify/top-artists', {
                    headers: {
                        'Authorization': `Bearer ${token}` // Attach the token to the request header
                    }
                });

                // Step 3: Set the fetched data to state
                setTopArtists(response.data.items);
                setLoading(false);

            } catch (err) {
                setError("Failed to fetch Spotify data. Please log in again.");
                setLoading(false);
                console.error("Error fetching data:", err.response ? err.response.data : err.message);
                
                // If the token is invalid or expired, log the user out
                if (err.response && err.response.status === 401) {
                    localStorage.removeItem('userToken');
                    navigate('/login');
                }
            }
        };

        fetchUserData();
    }, [navigate]);

    if (loading) {
        return <div>Loading your Spotify data...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Your Top Artists</h1>
            <ul>
                {topArtists.map(artist => (
                    <li key={artist.id}>{artist.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;