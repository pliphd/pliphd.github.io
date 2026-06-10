close all;
hf = figure('Color', 'w');
hc = ezplot(@(x) (x-5).^2, [3, 8], hf);

hc.Color = 'k';

set(gca, "Box", 'off', "TickDir", 'out', "TickLength", [0.02 0.02], ...
    'XTick', 0:2:10, 'YLim', [-1 3], 'YTick', -2:1:10);

ylabel('y');

set(gca, NextPlot = "add");


% add a circle
c0 = [5.5 0.25];

text(c0(1)-.05, c0(2)+.15, 'A');

the = 0:.01:2*pi;
x = sin(the) + c0(1);
y = cos(the) + c0(2);

hd = plot(5.5, 0.25, MarkerFaceColor = 'b', MarkerEdgeColor = 'b', MarkerSize = 5, Marker='o');
hu = plot(x, y, 'b');

axis equal

title(gca, 'y = (x - 5)^2');

% add first arrow along x axis
c11 = [6.5 0.25];
d11 = c11 - c0;
quiver(c0(1), c0(2), d11(1), d11(2), 0, 'm');

c12 = [6.5 2.25];
d12 = c12 - c11;
quiver(c11(1), c11(2), d12(1), d12(2), 0, 'm');

text(c12(1)-.1, c12(2)+.15, 'B');
hd = plot(c12(1), c12(2), MarkerFaceColor = 'b', MarkerEdgeColor = 'b', MarkerSize = 5, Marker='o');

% add second arrow any direction
the1 = 150/360*2*pi;
c21 = [sin(the1) + c0(1), cos(the1) + c0(2)];
d21 = c21 - c0;
quiver(c0(1), c0(2), d21(1), d21(2), 0, 'm--');

c22 = [sin(the1)+c0(1), (sin(the1)+c0(1)-5)^2];
d22 = c22 - c21;
quiver(c21(1), c21(2), d22(1), d22(2), 0, 'm--');

text(c22(1)-.15, c22(2)+.06, 'C');
hd = plot(c22(1), c22(2), MarkerFaceColor = 'b', MarkerEdgeColor = 'b', MarkerSize = 5, Marker='o');