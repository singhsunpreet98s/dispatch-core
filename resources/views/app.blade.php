<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|plus-jakarta-sans:500,600,700" rel="stylesheet" />

        <script>
            (function () {
                var accent = @json(auth()->check() ? auth()->user()->accent_color : null);
                if (!accent) return;
                var colors = {
                    indigo:  { light: 'hsl(243 75% 59%)', dark: 'hsl(237 88% 73%)' },
                    violet:  { light: 'hsl(258 90% 66%)', dark: 'hsl(255 91% 76%)' },
                    purple:  { light: 'hsl(271 81% 56%)', dark: 'hsl(271 76% 70%)' },
                    pink:    { light: 'hsl(330 81% 60%)', dark: 'hsl(330 81% 74%)' },
                    rose:    { light: 'hsl(351 89% 60%)', dark: 'hsl(351 89% 72%)' },
                    orange:  { light: 'hsl(25 95% 53%)',  dark: 'hsl(25 90% 68%)'  },
                    amber:   { light: 'hsl(38 92% 50%)',  dark: 'hsl(38 90% 65%)'  },
                    emerald: { light: 'hsl(152 69% 43%)', dark: 'hsl(152 69% 57%)' },
                    teal:    { light: 'hsl(172 66% 44%)', dark: 'hsl(172 66% 58%)' },
                    cyan:    { light: 'hsl(188 86% 47%)', dark: 'hsl(188 86% 60%)' },
                    sky:     { light: 'hsl(199 89% 48%)', dark: 'hsl(199 89% 62%)' },
                    blue:    { light: 'hsl(213 94% 51%)', dark: 'hsl(213 94% 65%)' },
                };
                var entry = colors[accent];
                if (!entry) return;
                var savedAppearance = localStorage.getItem('appearance') || 'system';
                var isDark = savedAppearance === 'dark' || (savedAppearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                var hsl = isDark ? entry.dark : entry.light;
                var m = hsl.match(/hsl\((\d+)\s+(\d+)%/);
                var hoverTint = m ? 'hsl(' + m[1] + ' ' + m[2] + '% ' + (isDark ? '20' : '93') + '%)' : hsl;
                var root = document.documentElement;
                root.style.setProperty('--primary', hsl);
                root.style.setProperty('--ring', hsl);
                root.style.setProperty('--sidebar-primary', hsl);
                root.style.setProperty('--sidebar-accent', hoverTint);
                root.style.setProperty('--sidebar-accent-foreground', hsl);
            })();
        </script>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
