import React, { useState, useEffect } from 'react';
import { Box, Text, Badge, Card, CardBody, CardHeader } from '@adminjs/design-system';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = window.DASHBOARD_DATA || {
                    totalReleases: 0,
                    featuredReleases: 0,
                    upcomingEvents: 0,
                    newContacts: 0,
                    activeSubscribers: 0,
                    totalPlays: 0,
                    genreStats: [],
                    topTracks: []
                };
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <Box p="xl">
                <Text>Loading dashboard...</Text>
            </Box>
        );
    }

    if (!stats) {
        return (
            <Box p="xl">
                <Text color="error">Failed to load dashboard statistics</Text>
            </Box>
        );
    }

    return (
        <Box p="xl">
            <Box mb="xl">
                <Text as="h1" fontSize="2xl" fontWeight="bold">
                    CORE64 Records Dashboard
                </Text>
                <Text>
                    Welcome to SunFixer & OVM management panel
                </Text>
            </Box>

            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="lg" mb="xl">
                <Card>
                    <CardHeader>
                        <Text fontSize="sm">Total Releases</Text>
                    </CardHeader>
                    <CardBody>
                        <Text fontSize="2xl" fontWeight="bold">
                            {stats.totalReleases}
                        </Text>
                        <Text fontSize="sm">
                            {stats.featuredReleases} featured
                        </Text>
                    </CardBody>
                </Card>
            </Box>
        </Box>
    );
};

export default Dashboard;