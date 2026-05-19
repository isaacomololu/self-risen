import cityTimezones from 'city-timezones';
import * as ct from 'countries-and-timezones';
import { UserLocaleDto } from '../dto/user-locale.dto';

export interface UserLocaleUpdateData {
    timezone?: string;
    locale?: string;
    countryCode?: string;
    city?: string;
    locationUpdatedAt?: Date;
}

interface CityTimezoneMatch {
    iso2?: string;
    timezone?: string;
    pop?: number;
}

/**
 * Resolve IANA timezone from ISO country code + city.
 */
export function resolveTimezoneFromLocation(
    countryCode: string,
    city: string,
): string | null {
    const iso2 = countryCode.trim().toUpperCase();
    const cityName = city.trim();
    if (!iso2 || !cityName) {
        return null;
    }

    let matches: CityTimezoneMatch[] = cityTimezones.lookupViaCity(cityName) ?? [];
    matches = matches.filter((m) => m.iso2?.toUpperCase() === iso2);

    if (matches.length >= 1) {
        if (matches.length > 1) {
            matches.sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0));
        }
        return matches[0].timezone ?? null;
    }

    const country = ct.getCountry(iso2);
    const zones = country?.timezones ?? [];
    if (zones.length === 1) {
        return zones[0];
    }

    return null;
}

/**
 * Build Prisma user fields from locale/location DTO.
 * Timezone is always derived from countryCode + city when both are present.
 */
export function buildUserLocaleUpdate(
    dto?: UserLocaleDto | null,
): UserLocaleUpdateData | null {
    if (!dto) {
        return null;
    }

    const data: UserLocaleUpdateData = {};
    let touched = false;

    if (dto.locale?.trim()) {
        data.locale = dto.locale.trim();
        touched = true;
    }

    if (dto.countryCode?.trim()) {
        data.countryCode = dto.countryCode.trim().toUpperCase();
        touched = true;
    }

    if (dto.city?.trim()) {
        data.city = dto.city.trim();
        touched = true;
    }

    if (data.countryCode && data.city) {
        const resolved = resolveTimezoneFromLocation(data.countryCode, data.city);
        if (resolved) {
            data.timezone = resolved;
            touched = true;
        }
    }

    if (!touched) {
        return null;
    }

    if (data.countryCode || data.city || data.timezone || data.locale) {
        data.locationUpdatedAt = new Date();
    }

    return data;
}
