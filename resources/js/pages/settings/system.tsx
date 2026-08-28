import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type AttendanceHoliday, type AttendanceSettings, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import ApiTokenTab from './system/api-token-tab';
import AttendanceTab from './system/attendance-tab';
import CampaignsTab, { type CampaignCommandStatus } from './system/campaigns-tab';
import CompanyInfoTab, { type CompanyInfo } from './system/company-info-tab';
import { type FeatureFlag } from './system/feature-flags-tab';
import FeatureFlagsTab from './system/feature-flags-tab';
import HolidaysTab from './system/holidays-tab';
import LogoTab from './system/logo-tab';

interface Props {
    logoUrl: string | null;
    companyInfo: CompanyInfo;
    featureFlagList: FeatureFlag[];
    attendanceSettings: AttendanceSettings;
    holidays: AttendanceHoliday[];
    commandStatus: CampaignCommandStatus;
    timezone: string;
    timezones: string[];
    apiToken: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'System Settings', href: '/settings/system' },
];

export default function SystemSettings({ logoUrl, companyInfo, featureFlagList, attendanceSettings, holidays, commandStatus, timezone, timezones, apiToken }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">System Settings</h1>
                    <p className="text-muted-foreground text-sm">Configure application-wide settings and feature flags</p>
                </div>

                <Tabs defaultValue="settings">
                    <TabsList>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        <TabsTrigger value="holidays">Holidays</TabsTrigger>
                        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                        <TabsTrigger value="api-token">API Token</TabsTrigger>
                    </TabsList>

                    <TabsContent value="settings" className="mt-4">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <LogoTab logoUrl={logoUrl} timezone={timezone} timezones={timezones} />
                            <CompanyInfoTab companyInfo={companyInfo} />
                        </div>
                    </TabsContent>

                    <TabsContent value="feature-flags" className="mt-4">
                        <FeatureFlagsTab featureFlags={featureFlagList} />
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-4">
                        <AttendanceTab attendanceSettings={attendanceSettings} />
                    </TabsContent>

                    <TabsContent value="holidays" className="mt-4">
                        <HolidaysTab holidays={holidays} />
                    </TabsContent>

                    <TabsContent value="campaigns" className="mt-4">
                        <CampaignsTab commandStatus={commandStatus} />
                    </TabsContent>

                    <TabsContent value="api-token" className="mt-4">
                        <ApiTokenTab apiToken={apiToken} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
