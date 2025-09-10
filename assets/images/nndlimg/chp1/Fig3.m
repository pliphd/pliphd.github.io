close all;
marksize = 3;
spacing = 0.1;
[x, y] = meshgrid(-2:spacing:2);
z = x .* exp(-x.^2 - y.^2);

figure('Color', 'w')

tiledlayout(2, 2, 'TileSpacing', 'tight');

ha1 = nexttile([1, 1]);

mesh(x, y, z, FaceAlpha=0.1);
xlabel('x'); ylabel('y'); zlabel('z');

x0 = 0.6; y0 = -0.8;
z0 = x0 .* exp(-x0^2 - y0^2);
hold on;
plot3(x0, y0, z0, Marker="o", MarkerSize=marksize, MarkerFaceColor="b", MarkerEdgeColor="b");

title(ha1, '$z = xe^{-x^2-y^2}$', 'Interpreter', 'latex');

ha2 = nexttile([1, 1]);
contour(x, y, z)
xlabel('x'); ylabel('y');

hold on
plot(x0, y0, Marker="o", MarkerSize=marksize, MarkerFaceColor="b", MarkerEdgeColor="b");

ha3 = nexttile([1, 2]);
[DX, DY] = gradient(z, spacing);
quiver(ha3, x, y, DX, DY);
hold on;
contour(ha3, x, y, z);
plot(ha3, x0, y0, Marker="o", MarkerSize=marksize, MarkerFaceColor="b", MarkerEdgeColor="b");
axis(ha3, 'equal');
xlabel('x'); ylabel('y');
xlim([0 1]);
ylim([-1 0]);

% calculate partial derivative
syms x y
f  = x .* exp(-x.^2 - y.^2);
fx = diff(f, x);
fy = diff(f, y);

fx0 = double(subs(subs(fx, x, x0), y, y0));
fy0 = double(subs(subs(fy, x, x0), y, y0));

% show the direction of gradient and its magnitude
quiver3(ha1, x0, y0, z0, fx0, fy0, 0, 3, 'ShowArrowHead', 'on', 'MaxHeadSize', 5);
quiver(ha2, x0, y0, fx0, fy0, 1, 'ShowArrowHead', 'on', 'MaxHeadSize', 5);