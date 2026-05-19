import {
    buildUserLocaleUpdate,
    resolveTimezoneFromLocation,
} from './user-locale.util';

describe('user-locale.util', () => {
    describe('resolveTimezoneFromLocation', () => {
        it('resolves US city timezone', () => {
            expect(resolveTimezoneFromLocation('US', 'Chicago')).toBe(
                'America/Chicago',
            );
        });

        it('picks the largest city when multiple share a name', () => {
            expect(resolveTimezoneFromLocation('US', 'Portland')).toBe(
                'America/Los_Angeles',
            );
        });

        it('returns null for unknown city in multi-timezone country', () => {
            expect(
                resolveTimezoneFromLocation('US', 'NonexistentCityXYZ123'),
            ).toBeNull();
        });
    });

    describe('buildUserLocaleUpdate', () => {
        it('derives timezone from country and city', () => {
            const result = buildUserLocaleUpdate({
                countryCode: 'US',
                city: 'New York',
            });
            expect(result?.timezone).toBe('America/New_York');
            expect(result?.countryCode).toBe('US');
            expect(result?.city).toBe('New York');
            expect(result?.locationUpdatedAt).toBeInstanceOf(Date);
        });

        it('includes locale when provided', () => {
            const result = buildUserLocaleUpdate({
                countryCode: 'GB',
                city: 'London',
                locale: 'en-GB',
            });
            expect(result?.locale).toBe('en-GB');
            expect(result?.timezone).toBe('Europe/London');
        });

        it('returns null when no locale fields provided', () => {
            expect(buildUserLocaleUpdate({})).toBeNull();
        });
    });
});
