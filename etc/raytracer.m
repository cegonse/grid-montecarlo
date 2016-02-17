#!/usr/bin/octave -qf
%
%  raytracer.m
%  César González Segura, 2015-2016
%  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
%
%  Octave script to draw spheres using ray tracing.
%
%  The script must receive two command line arguments to work:
%  first, the index (0~N-1 range) of the node running the script
%  and second, the number of nodes running on the Grid (N).
%
%  This script is free software: you can redistribute it and/or modify
%  it under the terms of the GNU General Public License as published by
%  the Free Software Foundation, either version 3 of the License, or
%  (at your option) any later version.
%
%  It is distributed in the hope that it will be useful,
%  but WITHOUT ANY WARRANTY; without even the implied warranty of
%  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
%  GNU General Public License for more details.
%
%  You should have received a copy of the GNU General Public License
%  along with these files.  If not, see <http://www.gnu.org/licenses/>.
%

% Get the node count and index from the 
% command-line args.
args = argv();

index = str2double(args{1});
nodes = str2double(args{2});
scale = 1 / nodes;

% Define the scene graph as three spheres
scene = struct();

scene(1).reflectance = 0.7;
scene(1).emittance = [1, 0, 0];
scene(1).center = [-3, -1, -20];
scene(1).radius = 3;

scene(2).reflectance = 0.8;
scene(2).emittance = [0, 1, 0];
scene(2).center = [0, 0, -15];
scene(2).radius = 2;

scene(3).reflectance = 0.6;
scene(3).emittance = [0, 0, 1];
scene(3).center = [3, 1, -35];
scene(3).radius = 4;

% Viewport size
w = 600;
h = 800;

% Camera related calculations
invWidth = 1 / w;
invHeight = 1 / h;
fov = 30;
aspectRatio = w / h;
a = tan(pi * 0.5 * fov / 180.); 

% Number of montecarlo passes
n = 10000;

% Framebuffer
img = zeros(w,h,3);

% Maximum depth passes
m_depth = 10;

% Camera position
m_eye = [0, 0, 0];

% Light direction
m_light = [0 0 1];

for i = 1:n
    % Generate a random pair of texel coordinates
    x = ceil(rand() * w);
    y = ceil((scale*index + scale * rand()) * h);
    
    % Keep generating until a non-black texel is found
    while any(img(x,y,:))
        x = ceil(rand() * w);
        y = ceil((scale*index + scale * rand()) * h);
    end

    % Get the ray from the eye to the texel
    xx = (2 * ((x + 0.5) * invWidth) - 1) * a * aspectRatio; 
    yy = (1 - 2 * ((y + 0.5) * invHeight)) * a; 
    zz = -1;
    
    ray = [xx,yy,zz] - m_eye;
    ray = ray / norm(ray);
    
    rgb = pathtrace(m_eye, ray, scene, m_light);

    img(x,y,1) = rgb(1);
    img(x,y,2) = rgb(2);
    img(x,y,3) = rgb(3);
end

% Save the result
filename = sprintf('/tmp/result_%d.png', index);
imwrite(img, filename);