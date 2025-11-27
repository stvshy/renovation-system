export const MOCK_PROJECTS = [
    {
        id: '1',
        name: 'Remont kuchni',
        clientName: 'Jan Kowalski',
        clientId: 'c1',
        address: 'ul. Przykładowa 1, 00-001 Warszawa',
        value: 15000,
        area: 50,
        status: 'In Progress'
    },
    {
        id: '2',
        name: 'Malowanie salonu',
        clientName: 'Anna Nowak',
        clientId: 'c2',
        address: 'ul. Testowa 2, 00-002 Warszawa',
        value: 5000,
        area: 30,
        status: 'In Progress'
    },
    {
        id: '3',
        name: 'Wymiana podłóg',
        clientName: 'Piotr Zieliński',
        clientId: 'c3',
        address: 'ul. Inna 3, 00-003 Warszawa',
        value: 10000,
        area: 70,
        status: 'Planned'
    }
] as const;

export const MOCK_MATERIALS = [
    { id: 'm1', name: 'Farba biała lateksowa', quantity: 50, unit: 'L', pricePerUnit: 25 },
    { id: 'm2', name: 'Panele podłogowe Dąb', quantity: 120, unit: 'm²', pricePerUnit: 80 },
    { id: 'm3', name: 'Gniazdka elektryczne', quantity: 200, unit: 'szt.', pricePerUnit: 15 },
    { id: 'm4', name: 'Klej do płytek', quantity: 25, unit: 'szt.', pricePerUnit: 35 },
    { id: 'm5', name: 'Drzwi wewnętrzne', quantity: 10, unit: 'szt.', pricePerUnit: 450 },
] as const;