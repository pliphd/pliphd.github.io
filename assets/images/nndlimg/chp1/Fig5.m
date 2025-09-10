close all;
hf = figure('Color', 'w');

x  = -5:.01:5;

y1 = zeros(size(x));
y1(x >= 0) = 1;

y2 = 1 ./ (1 + exp(-x));

plot(x, y1, 'k', x, y2, 'b', 'LineWidth', 2);

set(gca, "Box", 'off', "TickDir", 'out', "TickLength", [0.02 0.02], ...
    'XLim', [-5.2 5.2], 'XTick', -5:5, 'YLim', [0 1], 'YTick', 0:.2:1);

