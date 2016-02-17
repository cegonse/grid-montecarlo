#!/usr/bin/octave -qf
%
%  montecarlo.m
%  César González Segura, 2015-2016
%  <cegonse@posgrado.upv.es>, <cegonse@alumni.uv.es>
%
%  Octave script to estimate Pi using a Montecarlo simulation,
%  adapted for use on a single Grid node.
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

% Generate the corresponding part.
m_pi = 0;
n = 50000;

% Scale the random number to be in
% the interval for this node.
scale = 1 / nodes;

% Generate N random numbers
for i = 1:n
	% Obtain the random X and Y point.
	x = scale*index + scale*rand();
	y = rand();
	
	% Evaluate the circle function on the
	% obtained random points.
	a = sqrt(x*x + y*y);
	
	% If the point lies inside the radius,
	% score.
	if a <= 1
		m_pi = m_pi + 1;
	end
end

% Save the local result to the disk.
filename = sprintf('/tmp/result_%d.dlm', index);
dlmwrite(filename, m_pi);