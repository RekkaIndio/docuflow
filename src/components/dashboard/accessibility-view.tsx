"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, RotateCcw, Zap, Eye, Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Workspace } from "@/lib/types";
import { SidebarTrigger } from "../ui/sidebar";

interface AccessibilityViewProps {
    workspace: Workspace;
}

const FONT_SIZE_STORAGE_KEY = 'docuflow-font-size';
const DEFAULT_FONT_SIZE = 100; // 100% = normal size
const COLOR_THEME_STORAGE_KEY = 'docuflow-color-theme';

const ACCESSIBILITY_PROFILES = [
    {
        id: 'seizure-safe',
        name: 'Seizure Safe Profile',
        description: 'Clear flashes & reduces color',
        Icon: Zap
    },
    {
        id: 'vision-impaired',
        name: 'Vision Impaired Profile',
        description: "Enhances website's visuals",
        Icon: Eye
    },
    {
        id: 'adhd-friendly',
        name: 'ADHD Friendly Profile',
        description: 'More focus & fewer distractions',
        Icon: Brain
    },
    {
        id: 'cognitive-disability',
        name: 'Cognitive Disability Profile',
        description: 'Assists with reading & focusing',
        Icon: Target
    }
];

// Dyslexia-friendly color themes based on WCAG guidelines
const COLOR_THEMES = [
    {
        id: 'default',
        name: 'Default',
        description: 'Standard application colors',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        isDefault: true
    },
    {
        id: 'purple-cream',
        name: 'Purple on Cream',
        description: 'High contrast purple text on cream background',
        background: '#F5F3FA', // Light cream
        foreground: '#59029F', // Deep purple
        wcagRating: 'AAA'
    },
    {
        id: 'dark-purple-yellow',
        name: 'Dark Purple on Yellow',
        description: 'Dark purple text on light yellow background',
        background: '#FED636', // Light yellow
        foreground: '#340458', // Dark purple
        wcagRating: 'AAA'
    },
    {
        id: 'high-contrast',
        name: 'High Contrast',
        description: 'Maximum contrast for better readability',
        background: '#FFFFFF', // Pure white
        foreground: '#000000', // Pure black
        wcagRating: 'AAA'
    }
];

export function AccessibilityView({ workspace }: AccessibilityViewProps) {
    const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
    const [selectedTheme, setSelectedTheme] = useState('default');
    const [profileStates, setProfileStates] = useState<Record<string, boolean>>(() =>
        ACCESSIBILITY_PROFILES.reduce<Record<string, boolean>>((acc, profile) => {
            acc[profile.id] = false;
            return acc;
        }, {})
    );

    // Placeholder handler until profile presets are wired into the accessibility system
    const handleProfileToggle = (profileId: string, nextValue: boolean) => {
        setProfileStates((prev) => ({
            ...prev,
            [profileId]: nextValue,
        }));
    };

    // Load saved font size on mount
    useEffect(() => {
        const savedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
        if (savedFontSize) {
            const size = parseInt(savedFontSize, 10);
            setFontSize(size);
            applyFontSize(size);
        }

        const savedTheme = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
        if (savedTheme) {
            setSelectedTheme(savedTheme);
            applyColorTheme(savedTheme);
        }
    }, []);

    // Apply font size to document root
    const applyFontSize = (size: number) => {
        document.documentElement.style.setProperty('--font-scale', (size / 100).toString());
    };

    // Apply color theme to document root
    const applyColorTheme = (themeId: string) => {
        const theme = COLOR_THEMES.find(t => t.id === themeId);
        const body = document.body;
        
        // Remove any existing accessibility theme classes
        body.classList.remove('accessibility-purple-cream', 'accessibility-dark-purple-yellow', 'accessibility-high-contrast');
        
        if (!theme || theme.isDefault) {
            // Reset to default theme
            document.documentElement.style.removeProperty('--accessibility-background');
            document.documentElement.style.removeProperty('--accessibility-foreground');
            body.removeAttribute('data-accessibility-theme');
        } else {
            // Apply the new theme
            document.documentElement.style.setProperty('--accessibility-background', theme.background);
            document.documentElement.style.setProperty('--accessibility-foreground', theme.foreground);
            body.setAttribute('data-accessibility-theme', themeId);
            body.classList.add(`accessibility-${themeId}`);
        }
    };

    // Handle color theme change
    const handleColorThemeChange = (themeId: string) => {
        setSelectedTheme(themeId);
        applyColorTheme(themeId);
        localStorage.setItem(COLOR_THEME_STORAGE_KEY, themeId);
    };

    // Handle font size change
    const handleFontSizeChange = (newSize: number) => {
        setFontSize(newSize);
        applyFontSize(newSize);
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, newSize.toString());
    };

    // Preset size handlers
    const handleDecrease = () => {
        const newSize = Math.max(fontSize - 10, 80); // Min 80%
        handleFontSizeChange(newSize);
    };

    const handleIncrease = () => {
        const newSize = Math.min(fontSize + 10, 150); // Max 150%
        handleFontSizeChange(newSize);
    };

    const handleReset = () => {
        handleFontSizeChange(DEFAULT_FONT_SIZE);
    };

    // Get readable description of current size
    const getSizeDescription = (size: number) => {
        if (size <= 90) return "Small";
        if (size <= 110) return "Normal";
        if (size <= 130) return "Large";
        return "Extra Large";
    };

    return (
        <div className="flex flex-col h-full bg-muted/20">
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger />
                    <h1 className="text-2xl font-headline font-semibold">Accessibility Settings</h1>
                </div>
                
                <div className="max-w-2xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Choose the right accessibility profile for you</CardTitle>
                            <CardDescription>
                                Toggle a preset to preview upcoming accessibility bundles. We will connect these to real settings soon.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {ACCESSIBILITY_PROFILES.map(({ id, name, description, Icon }) => (
                                <div
                                    key={id}
                                    className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                                        profileStates[id]
                                            ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                                            : 'border-slate-200 bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                                        <p className="text-sm text-muted-foreground">{description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {profileStates[id] ? 'On' : 'Off'}
                                        </span>
                                        <Switch
                                            checked={profileStates[id]}
                                            onCheckedChange={(value) => handleProfileToggle(id, value)}
                                            aria-label={name}
                                        />
                                        <Icon className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Text Size</CardTitle>
                            <CardDescription>
                                Adjust the text size throughout the application to improve readability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Current size display */}
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Current size: {fontSize}%</div>
                                <div className="text-lg font-medium">{getSizeDescription(fontSize)}</div>
                                <div className="mt-2" style={{ fontSize: `${fontSize / 100}em` }}>
                                    Sample text at current size
                                </div>
                            </div>

                            {/* Slider control */}
                            <div className="space-y-4">
                                <Label htmlFor="font-size-slider">Font Size</Label>
                                <div className="px-3">
                                    <Slider
                                        id="font-size-slider"
                                        value={[fontSize]}
                                        onValueChange={(values) => handleFontSizeChange(values[0])}
                                        min={80}
                                        max={150}
                                        step={5}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>80%</span>
                                        <span>100%</span>
                                        <span>150%</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Quick action buttons */}
                            <div className="space-y-3">
                                <Label>Quick Actions</Label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDecrease}
                                        disabled={fontSize <= 80}
                                        className="flex items-center gap-2"
                                    >
                                        <Minus className="w-4 h-4" />
                                        Decrease
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleIncrease}
                                        disabled={fontSize >= 150}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Increase
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="flex items-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>

                            {/* Preset sizes */}
                            <div className="space-y-3">
                                <Label>Preset Sizes</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { label: "Small", value: 90 },
                                        { label: "Normal", value: 100 },
                                        { label: "Large", value: 120 },
                                        { label: "Extra Large", value: 140 }
                                    ].map(({ label, value }) => (
                                        <Button
                                            key={value}
                                            variant={fontSize === value ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handleFontSizeChange(value)}
                                            className="text-sm"
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Color Contrast for Dyslexia */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Color Contrast for Dyslexia</CardTitle>
                            <CardDescription>
                                Choose dyslexia-friendly color combinations that meet WCAG accessibility standards for better readability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Current theme preview */}
                            <div className="p-4 rounded-lg border" 
                                 style={{ 
                                     backgroundColor: COLOR_THEMES.find(t => t.id === selectedTheme)?.background || 'var(--background)',
                                     color: COLOR_THEMES.find(t => t.id === selectedTheme)?.foreground || 'var(--foreground)'
                                 }}>
                                <div className="text-sm font-medium mb-2">
                                    Current Theme: {COLOR_THEMES.find(t => t.id === selectedTheme)?.name}
                                </div>
                                <p className="text-base leading-relaxed">
                                    This is how text will appear with the selected color theme. 
                                    The combination has been chosen to reduce visual stress and improve readability for people with dyslexia.
                                </p>
                                {COLOR_THEMES.find(t => t.id === selectedTheme)?.wcagRating && (
                                    <div className="text-xs mt-2 opacity-75">
                                        WCAG Rating: {COLOR_THEMES.find(t => t.id === selectedTheme)?.wcagRating}
                                    </div>
                                )}
                            </div>

                            {/* Theme selection */}
                            <div className="space-y-3">
                                <Label>Available Color Themes</Label>
                                <div className="grid gap-3">
                                    {COLOR_THEMES.map((theme) => (
                                        <div
                                            key={theme.id}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                selectedTheme === theme.id 
                                                    ? 'ring-2 ring-primary bg-primary/5' 
                                                    : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => handleColorThemeChange(theme.id)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium">{theme.name}</h4>
                                                        {theme.wcagRating && (
                                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                                {theme.wcagRating}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{theme.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Color preview */}
                                                    <div 
                                                        className="w-12 h-8 rounded border flex items-center justify-center text-xs font-bold accessibility-preserve"
                                                        style={{ 
                                                            backgroundColor: theme.background,
                                                            color: theme.foreground 
                                                        }}
                                                    >
                                                        Aa
                                                    </div>
                                                    {selectedTheme === theme.id && (
                                                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* WCAG Information */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                    About WCAG Color Contrast
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                    These color combinations follow Web Content Accessibility Guidelines (WCAG) standards:
                                </p>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li><strong>AA:</strong> Minimum contrast ratio of 4.5:1 for normal text</li>
                                    <li><strong>AAA:</strong> Enhanced contrast ratio of 7:1 for better accessibility</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Future accessibility features placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>More Accessibility Options</CardTitle>
                            <CardDescription>
                                Additional accessibility features will be added here in future updates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                Coming soon:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Reading guides and focus indicators</li>
                                    <li>Keyboard navigation improvements</li>
                                    <li>Screen reader optimizations</li>
                                    <li>Motion and animation controls</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

// Also provide a default export for simpler imports
export default AccessibilityView;
