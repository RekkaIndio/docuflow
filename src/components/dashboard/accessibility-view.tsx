"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { Workspace } from "@/lib/types";
import { SidebarTrigger } from "../ui/sidebar";

interface AccessibilityViewProps {
    workspace: Workspace;
}

const FONT_SIZE_STORAGE_KEY = 'docuflow-font-size';
const DEFAULT_FONT_SIZE = 100; // 100% = normal size

export function AccessibilityView({ workspace }: AccessibilityViewProps) {
    const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

    // Load saved font size on mount
    useEffect(() => {
        const savedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
        if (savedFontSize) {
            const size = parseInt(savedFontSize, 10);
            setFontSize(size);
            applyFontSize(size);
        }
    }, []);

    // Apply font size to document root
    const applyFontSize = (size: number) => {
        document.documentElement.style.setProperty('--font-scale', (size / 100).toString());
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
                                    <li>High contrast mode</li>
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
