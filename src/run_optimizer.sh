for j in `jot - 2 25`; do 
    java -jar optimizer/target/optimizer.jar solutions/best/$j.txt solutions/optimized/$j.txt problems/$j.png ;
done;

for j in `jot - 26 35`; do
    java -jar optimizer/target/optimizer.jar solutions/best/$j.txt problems/$j.initial.json;
done;

for j in `jot - 36 40`; do 
    java -jar optimizer/target/optimizer.jar solutions/best/$j.txt solutions/optimized/$j.txt problems/$j.png 
    done;
