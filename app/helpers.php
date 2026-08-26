<?php

if (! function_exists('getEasternFormattedDate')) {
    function getEasternFormattedDate(): string
    {
        return now('America/New_York')->format('F j, Y');
    }
}
