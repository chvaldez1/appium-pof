export interface SimulatorRuntime {
  identifier: string;
  version: string;
  platform: string;
  isAvailable: boolean;
  supportedDeviceTypes: Array<{
    identifier: string;
    name: string;
    productFamily: string;
  }>;
}

export interface SelectedRuntime {
  major: number;
  runtime: SimulatorRuntime | undefined;
}

export const recentIosMajors = [27, 26, 18] as const;

export function selectIosRuntimes(
  runtimes: SimulatorRuntime[],
  majors: readonly number[] = recentIosMajors,
): SelectedRuntime[] {
  return majors.map((major) => ({
    major,
    runtime: runtimes
      .filter(
        (runtime) =>
          runtime.platform === 'iOS' &&
          runtime.isAvailable &&
          Number(runtime.version.split('.')[0]) === major,
      )
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0],
  }));
}

export function parseIosMajors(value: string | undefined): number[] {
  if (!value) return [...recentIosMajors];
  const majors = value.split(',').map((part) => Number(part.trim()));
  if (
    majors.length === 0 ||
    majors.length > 3 ||
    majors.some((major) => !Number.isSafeInteger(major) || major < 1) ||
    new Set(majors).size !== majors.length
  ) {
    throw new Error('IOS_MAJOR_VERSIONS must be one to three distinct iOS major versions, e.g. 27,26,18.');
  }
  return majors;
}
