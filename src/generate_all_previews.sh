for j in `jot - 1 25`; do java -jar optimizer/target/optimizer.jar solutions/best/$j.txt; done;
for j in `jot - 26 35`; do java -jar optimizer/target/optimizer.jar solutions/best/$j.txt problems/$j.initial.json; done;
for j in `jot - 36 40`; do java -jar optimizer/target/optimizer.jar solutions/best/$j.txt; done;

cp solutions/best/*.txt.png previews/1/
