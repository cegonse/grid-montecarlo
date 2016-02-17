#!/usr/bin/octave -qf
%
%  post_ray.m
%  César González Segura, 2015-2016
%  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
%
%  Octave script to obtain the final rendered image from
%  the results gathered from all the Grid nodes.
%
%  The script must receive one command line arguments to work:
%  the number of nodes running on the Grid (N).
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

% Get the number of nodes from the command-line
% argument.
args = argv();
nodes = str2double(args{1});

w = 600;
h = 800;
im_res = ones(w,h,3);

% Load all the processed results.
for i = 1:nodes
	filename = sprintf('./tmp/result_%d.png', i-1);
	
	s = dir(filename);
	
	if s.bytes > 0
		im_res = im_res + imread(filename);
	end
end

% Reduce to the final result and save
% to disk.
imwrite(im_res, './res/trace.png');