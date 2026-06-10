close all;
[X, Y] = meshgrid(-5:.5:5);
R = sqrt(X.^2 + Y.^2) + eps;
Z = - sin(R)./R;
figure('Color', 'w');
surf(X, Y, Z, FaceAlpha=0.9);

x0 = 0.5; y0 = -1.5;
z0 = -sin(sqrt(x0^2+y0^2) + eps) ./ (sqrt(x0^2+y0^2) + eps);

hold on;
plot3(x0, y0, z0, Marker="o", MarkerSize=10, MarkerFaceColor="b", MarkerEdgeColor="b");

xlabel('x'); ylabel('y'); zlabel('z');

% calculate partial derivative
syms x y
f  = - sin(sqrt(x^2+y^2))/sqrt(x^2+y^2);
fx = diff(f, x);
fy = diff(f, y);

fx0 = double(subs(subs(fx, x, x0), y, y0));
fy0 = double(subs(subs(fy, x, x0), y, y0));

% tangent plane at the point
z = @(x, y) z0 + fx0*(x - x0) + fy0*(y - y0);

mesh(X, Y, z(X, Y), FaceAlpha=0.5);

zlim([-1, 0.5]);

% show the direction of gradient and its magnitude
quiver3(x0, y0, z0, fx0, fy0, 0, 5, 'ShowArrowHead', 'on', 'MaxHeadSize', 5);

% projection
plot3(x0, y0, -1, Marker="o", MarkerSize=10, MarkerFaceColor=1-0.2*([1, 1, 0]), MarkerEdgeColor=1-0.2*([1, 1, 0]));
quiver3(x0, y0, -1, fx0, fy0, 0, 5, 'ShowArrowHead', 'on', 'MaxHeadSize', 5, 'Color', 1-0.2*([0, 1, 1]));

title('$z = -\frac{sin(\sqrt{x^2+y^2})}{\sqrt{x^2+y^2}}$', 'Interpreter', 'latex');