export default async (_, services) => ({ keys: Object.keys(services).sort() });
