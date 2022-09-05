package solver;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.awt.image.WritableRaster;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.SQLOutput;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.stream.Collectors;

public class Main {

    public static class ExecutionResult {
        List<Command> program;
        long initialCost;
        long programCost;
        long imageDiffCost;
        long totalCost;

        public ExecutionResult(List<Command> program, long initialCost, long programCost, long imageDiffCost) {
            this.program = program;
            this.initialCost = initialCost;
            this.programCost = programCost;
            this.imageDiffCost = imageDiffCost;
            this.totalCost = programCost + imageDiffCost;
        }

        @Override
        public String toString() {
            return "# ExecutionResult{" +
                    "initialCost=" + initialCost +
                    ", programCost=" + programCost +
                    ", imageDiffCost=" + imageDiffCost +
                    ", totalCost=" + totalCost +
                    '}';
        }
    }

    public static void main(String[] args) throws IOException {
        if (args.length == 1 || args.length == 2) {
            String programName = args[0];
            String initialStateJson = args.length == 2? args[1]: null;
            printImage(programName, initialStateJson);
            System.out.println("Image exported: " + programName + ".png");
            return;
        }
        if (args.length != 3 && args.length != 4) {
            System.out.println("Not enough arguments!");
            System.out.println("java -jar optimizer.jar <solution_in> <optimized_out> <target png> [<initial state json>]");
            System.out.println("example 1: java -jar optimizer.jar 2.txt 2.opt.txt 2.png");
            System.out.println("example 1: java -jar optimizer.jar 34.txt 34.opt.txt 34.png 34.initial.json");
            return;
        }
        
        String program = args[0];
        String optProgram = args[1];
        String targetImage = args[2];
        String initialStateJson = args.length == 4? args[3]: null;

        System.out.println("Running on " + targetImage); 
        optimize(targetImage,
                initialStateJson,
                program,
                optProgram);
    }

    public static void printImage(String solutionFile, String initialStateJson) throws IOException {
        List<Command> program = loadProgram(solutionFile);
        BufferedImage target = new BufferedImage(400, 400, BufferedImage.TYPE_4BYTE_ABGR);
        Canvas initial = initialStateJson == null? new Canvas(): loadInitialState(initialStateJson);
        executeProgram(initial, target, program);
        ImageIO.write(initial.getImage(), "png", new File(String.format("%s.png", solutionFile)));
    }

    public static void main2(String[] args) throws IOException {
//        test("/Users/dmitrykorolev/projects/icfpc-2022/problems/34.png",
//                "/Users/dmitrykorolev/projects/icfpc-2022/problems/34.initial.json",
//                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/manual_vitaly/34.txt");

//        test("/Users/dmitrykorolev/projects/icfpc-2022/problems/2.png",
//                null,
//                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/manual_robot/9k/2.txt");

        optimize("/Users/dmitrykorolev/projects/icfpc-2022/problems/19.png",
                null,
                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/binary_solver_2/19.txt",
                null);

//        test("/Users/dmitrykorolev/projects/icfpc-2022/problems/35.png",
//                "/Users/dmitrykorolev/projects/icfpc-2022/problems/35.initial.json",
//                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/manual_fourdman/34.txt");

//        test("/Users/dmitrykorolev/projects/icfpc-2022/problems/1.png",
//                null,
//                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/manual_chess/19k/1.txt");
//
//        test("/Users/dmitrykorolev/projects/icfpc-2022/problems/1.png",
//                null,
//                "/Users/dmitrykorolev/projects/icfpc-2022/solutions/manual_chess/32k/1.txt");
    }

    public static void optimize(String problemFileName, String initialStateFile, String solutionFile, String optSolutionFile) throws IOException {
        List<Command> program = loadProgram(solutionFile);
        ExecutionResult originalResult = test(0, problemFileName, initialStateFile, program);
        ExecutionResult bestResult = originalResult;

        int count = 1;
        int len = program.size();
        for (int i = 0; i < len-1; i++) {
            Command command = program.get(i);
            if (command.getType() == MoveType.LINE_CUT) {
                LineCutMove cut = (LineCutMove) command;
                for (int j = -4; j <= 4; j++) {
                    List<Command> currentProgram = new ArrayList<>(len);
                    currentProgram.addAll(bestResult.program.subList(0, i));
                    Command modifiedMove = new LineCutMove(cut.getBlockId(), cut.getOrientation(), cut.getOffset() + j);
                    currentProgram.add(modifiedMove);
                    currentProgram.addAll(program.subList(i+1, len));

                    ExecutionResult result = test(originalResult.totalCost, problemFileName, initialStateFile, currentProgram);
                    count++;

                    if (result.totalCost < bestResult.totalCost) {
                        System.out.println(String.format("[%d/%d] (line cut) new best score found: %d -> %d (start = %d)", i, len, bestResult.totalCost, result.totalCost, originalResult.totalCost));
                        bestResult = result;
                    }
                }
            } if (command.getType() == MoveType.POINT_CUT) {
                PointCutMove cut = (PointCutMove) command;
                for (int dx = -4; dx <= 4; dx++) {
                    for (int dy = -4; dy <= 4; dy++) {
                        List<Command> currentProgram = new ArrayList<>(len);
                        currentProgram.addAll(bestResult.program.subList(0, i));
                        Command modifiedMove = new PointCutMove(cut.blockId, new Point(cut.point.x + dx, cut.point.y +dy));
                        currentProgram.add(modifiedMove);
                        currentProgram.addAll(program.subList(i+1, len));

                        ExecutionResult result = test(originalResult.totalCost, problemFileName, initialStateFile, currentProgram);
                        count++;

                        if (result.totalCost < bestResult.totalCost) {
                            System.out.println(String.format("[%d/%d] (point cut) new best score found: %d -> %d (start = %d)", i, len, bestResult.totalCost, result.totalCost, originalResult.totalCost));
                            bestResult = result;
                        }
                    }
                }
            }
//            if (command.getType() == MoveType.COLOR) {
//                ColorMove colorMove = (ColorMove) command;
//                for (int a = -2; a <= 2; a++) {
//                    for (int b = -2; b <= 2; b++) {
//                        for (int g = -2; g <= 2; g++) {
//                            for (int r = -2; r <= 2; r++) {
//                                int[] color = colorMove.color;
//                                int[] newColor = new int[] {
//                                    (color[0] + a) & 0xFF,
//                                    (color[1] + b) & 0xFF,
//                                    (color[2] + g) & 0xFF,
//                                    (color[3] + r) & 0xFF
//                                };
//                                Command modifiedMove = new ColorMove(colorMove.blockId, newColor);
//                                List<Command> currentProgram = new ArrayList<>(bestResult.program);
//                                currentProgram.set(i, modifiedMove);
//
//                                ExecutionResult result = test(count, problemFileName, initialStateFile, currentProgram);
//                                count++;
//
//                                if (result.totalCost < bestResult.totalCost) {
//                                    System.out.println(String.format("[%d/%d] (color) new best score found: %d -> %d", i, len, bestResult.totalCost, result.totalCost));
//                                    bestResult = result;
//                                }
//                            }
//                        }
//                    }
//                }
//            }
        }

        PrintStream printStream = optSolutionFile != null? new PrintStream(optSolutionFile): System.out;
        printStream.println("################# BEST RESULT #########################");
        for (Command c: bestResult.program) {
            printStream.println(c);
        }
        printStream.println(bestResult);
        printStream.flush();
    }

    public static ExecutionResult test(long initialCost, String problemFileName, String initialStateFile, List<Command> program) throws IOException {
        BufferedImage target = ImageIO.read(new File(problemFileName));
        Canvas initial = initialStateFile == null? new Canvas(): loadInitialState(initialStateFile);
        long programCost = executeProgram(initial, target, program);
        long imageDiffCost = imageDiff(target, initial.getImage());
        //ImageIO.write(initial.getImage(), "png", new File(String.format("/Users/dmitrykorolev/projects/icfp22-solver/solution/%d.png", id)));
        return new ExecutionResult(program, initialCost, programCost, imageDiffCost);
    }

    public static int[] toIntArray(List<Double> doubles) {
        return doubles.stream().mapToInt(Double::intValue).toArray();
    }

    public static Canvas loadInitialState(String initialStateFile) throws IOException {
        Gson gson = new Gson();
        Type type = new TypeToken<HashMap<String, Object>>(){}.getType();
        String content = new String(Files.readAllBytes(Paths.get(initialStateFile)));
        Map<String, Object> state = gson.fromJson(content, type);
        int width = ((Double) state.get("width")).intValue();
        int height = ((Double) state.get("height")).intValue();
        List<Map<String, Object>> rawBlocks = (List<Map<String, Object>>) state.get("blocks");
        List<Block> blocks = new ArrayList<>();
        for (Map<String, Object> block: rawBlocks) {
            String blockId = (String) block.get("blockId");
            int[] bottomLeft = toIntArray((List<Double>) block.get("bottomLeft"));
            int[] topRight = toIntArray((List<Double>) block.get("topRight"));
            int[] color = toIntArray((List<Double>) block.get("color"));
            blocks.add(new Block(blockId, new Point(bottomLeft), new Point(topRight), color));
        }
        return new Canvas(width, height, blocks);
    }

    private static int toNumber(String s) {
        return Integer.parseInt(s);
    }

    private static Point toPoint(String s) {
        int[] xy = Arrays.stream(s.split(",")).mapToInt(Integer::parseInt).toArray();
        return new Point(xy);
    }

    private static int[] toColor(String s) {
        return Arrays.stream(s.split(",")).mapToInt(Integer::parseInt).toArray();
    }

    public static List<Command> loadProgram(String programFile) throws IOException {
        File file = new File(programFile);
        Scanner sc = new Scanner(file);
        List<Command> program = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            if (line.startsWith("#")) {
                continue;
            }
            line = line.replace(" ", "");
            List<String> partsList = Arrays.stream(line.replace(" ", "")
                            .split("\\["))
                            .map(s -> s.replace("]", ""))
                            .collect(Collectors.toList());
            String[] parts = partsList.toArray(new String[0]);

            if (parts[0].equals("color")) {
                String blockId = parts[1];
                int[] color = toColor(parts[2]);
                program.add(new ColorMove(blockId, color));
            } else if (line.startsWith("swap")) {
                String block1 = parts[1];
                String block2 = parts[2];
                program.add(new SwapMove(block1, block2));
            } else if (line.startsWith("merge")) {
                String block1 = parts[1];
                String block2 = parts[2];
                program.add(new MergeMove(block1, block2));
            } else if (line.startsWith("cut")) {
                String blockId = parts[1];
                if (parts.length == 3) { // point cut
                    Point point = toPoint(parts[2]);
                    program.add(new PointCutMove(blockId, point));
                } else { // line cut
                    String orientation = parts[2];
                    int lineNumber = toNumber(parts[3]);
                    program.add(new LineCutMove(blockId, orientation, lineNumber));
                }
            }
        }

        return program;
    }

    public static long executeProgram(Canvas canvas, BufferedImage target, List<Command> program) {
        long score = 0;
        try {
            for (Command command : program) {
                long cost = command.apply(canvas, target);
                score += cost;
            }
            return score;
        } catch (Exception ex) {
            return Integer.MAX_VALUE;
        }
    }

    public static long imageDiff(BufferedImage img1, BufferedImage img2) {
        if (img1.getType() != img2.getType()) {
            throw new IllegalStateException(
                    String.format("Images have different types: %d != %d", img1.getType(), img2.getType()));
        }
        if (img1.getWidth() != img2.getWidth() || img1.getHeight() != img2.getHeight()) {
            throw new IllegalStateException("Images must have the same size");
        }
        WritableRaster r1 = img1.getRaster();
        WritableRaster r2 = img2.getRaster();
        int width = r1.getWidth();
        int height = r1.getHeight();

        double diff = 0;
        int[] p1 = new int[4];
        int[] p2 = new int[4];
        for (int i = 0; i < width; i++) {
            for (int j = 0; j < height; j++) {
                p1 = r1.getPixel(i, j, p1);
                p2 = r2.getPixel(i, j, p2);
                diff += pixelDiff(p1, p2);
            }
        }

        return Math.round(diff * 0.005);
    }

    public static long blockDiff(Block block, BufferedImage target, int[] color) {
        double diff = 0;
        int[] p1 = new int[4];
        WritableRaster r1 = target.getRaster();
        for (int i = block.bottomLeft.x; i < block.topRight.x; i++) {
            for (int j = block.bottomLeft.y; j < block.topRight.y; j++) {
                p1 = r1.getPixel(i, j, p1);
                diff += pixelDiff(p1, color);
            }
        }

        return Math.round(diff * 0.005);
    }

    public static double pixelDiff(int[] p1, int[] p2) {
        long d2 = 0;
        for (int i = 0; i < 4; i++) {
            d2 += (long) (p1[i] - p2[i]) * (p1[i] - p2[i]);
        }
        return Math.sqrt(d2);
    }

    public enum MoveType {
        LINE_CUT("cut",7),
        POINT_CUT("cut", 10),
        COLOR("color", 5),
        SWAP("swap", 3),
        MERGE("merge",1);
        String value;
        int baseCost;

        MoveType(String value, int baseCost) {
            this.value = value;
            this.baseCost = baseCost;
        }

        public int getBaseCost() {
            return baseCost;
        }

        public String getValue() {
            return value;
        }
    }

    public static abstract class Command {
        public abstract long apply(Canvas canvas, BufferedImage target);
        public abstract MoveType getType();
        public abstract String toString();
    }

    public static String arrToString(int[] arr) {
        return Arrays.stream(arr).mapToObj(Integer::toString).collect(Collectors.joining(", "));
    }

    public static class ColorMove extends Command {
        String blockId;
        int[] color;

        public ColorMove(String blockId, int[] color) {
            this.blockId = blockId;
            this.color = color;
        }

        @Override
        public long apply(Canvas canvas, BufferedImage target) {
            //System.out.printf("Color: %s, %s%n", blockId, arrToString(color));
            return canvas.color(blockId, color, target);
        }

        @Override
        public MoveType getType() {
            return MoveType.COLOR;
        }

        @Override
        public String toString() {
            return String.format("%s [%s] [%s]", getType().getValue(), blockId, arrToString(color));
        }
    }

    public static class SwapMove extends Command {
        private String block1;
        private String block2;

        public SwapMove(String block1, String block2) {
            this.block1 = block1;
            this.block2 = block2;
        }

        @Override
        public long apply(Canvas canvas, BufferedImage target) {
            return canvas.swap(block1, block2);
        }

        @Override
        public MoveType getType() {
            return MoveType.SWAP;
        }

        @Override
        public String toString() {
            return String.format("%s [%s] [%s]", getType().getValue(), block1, block2);
        }
    }

    public static class MergeMove extends Command {
        private String block1;
        private String block2;

        public MergeMove(String block1, String block2) {
            this.block1 = block1;
            this.block2 = block2;
        }

        @Override
        public long apply(Canvas canvas, BufferedImage target) {
            return canvas.merge(block1, block2);
        }

        @Override
        public MoveType getType() {
            return MoveType.MERGE;
        }

        @Override
        public String toString() {
            return String.format("%s [%s] [%s]", getType().getValue(), block1, block2);
        }
    }


    public static class LineCutMove extends Command {
        private String blockId;
        private String orientation;
        private int offset;

        public LineCutMove(String blockId, String orientation, int offset) {
            this.blockId = blockId;
            this.orientation = orientation;
            this.offset = offset;
        }

        @Override
        public long apply(Canvas canvas, BufferedImage target) {
            return canvas.lineCut(blockId, orientation, offset);
        }

        public String getBlockId() {
            return blockId;
        }

        public String getOrientation() {
            return orientation;
        }

        @Override
        public MoveType getType() {
            return MoveType.LINE_CUT;
        }

        public int getOffset() {
            return offset;
        }

        public void setOffset(int offset) {
            this.offset = offset;
        }

        @Override
        public String toString() {
            return String.format("%s [%s] [%s] [%d]", getType().getValue(), blockId, orientation, offset);
        }
    }

    public static class PointCutMove extends Command {
        private String blockId;
        private Point point;

        public PointCutMove(String blockId, Point point) {
            this.blockId = blockId;
            this.point = point;
        }

        @Override
        public long apply(Canvas canvas, BufferedImage target) {
            return canvas.pointCut(blockId, point);
        }

        @Override
        public MoveType getType() {
            return MoveType.POINT_CUT;
        }

        @Override
        public String toString() {
            return String.format("%s [%s] [%d, %d]", getType().getValue(), blockId, point.x, point.y);
        }
    }

    public static long cost(MoveType moveType, Block block, Canvas canvas) {
        return Math.round((double) moveType.getBaseCost() * canvas.getSize() / block.getSize());
    }

    static class Canvas {
        private int blockCounter = 0;
        private int width;
        private int height;
        private BufferedImage image;
        private BufferedImage target;
        Map<String, Block> blocks = new HashMap<>();

        public Canvas() {
            this.width = 400;
            this.height = 400;
            image = new BufferedImage(width, height, BufferedImage.TYPE_4BYTE_ABGR);
            Block block = new Block(
                    Integer.toString(blockCounter),
                    new Point(0, 0),
                    new Point(width, height),
                    new int[] {255, 255, 255, 255});
            addBlock(block);
            applyColor(block);
        }

        public Canvas(int width, int height, List<Block> blocks) {
            this.width = width;
            this.height = height;
            image = new BufferedImage(width, height, BufferedImage.TYPE_4BYTE_ABGR);
            blocks.forEach(b -> {
                addBlock(b);
                applyColor(b);
            });
            blockCounter = blocks.size() - 1;
        }

        public BufferedImage getImage() {
            return image;
        }

        public int getWidth() {
            return width;
        }

        public int getHeight() {
            return height;
        }

        public long getSize() {
            return (long) getWidth() * getHeight();
        }

        public void addBlock(Block block) {
            //System.out.println("Add block: " + block);
            blocks.put(block.blockId, block);
        }

        public void applyColor(Block block) {
            WritableRaster raster = image.getRaster();
            for (int i = block.bottomLeft.x; i < block.topRight.x; i++) {
                for (int j = block.bottomLeft.y; j < block.topRight.y; j++) {
                    raster.setPixel(i, image.getHeight() - j - 1, block.color);
                }
            }
        }

        public int[] findBestColor(Block block, int[] color, BufferedImage target) {
            int[] bestColor = new int[4];
            System.arraycopy(color, 0, bestColor, 0, 4);
            long bestScore = blockDiff(block, target, bestColor);

            for (int k = 0; k < 4; k++) {
                int[] tmpColor = new int[4];
                System.arraycopy(bestColor, 0, tmpColor, 0, 4);
                for (int c = 0; c <= 255; c++) {
                    tmpColor[k] = c;
                    long score = blockDiff(block, target, tmpColor);
                    if (score < bestScore) {
                        bestScore = score;
                        System.arraycopy(tmpColor, 0, bestColor, 0, 4);
                    }                }
            }
            return bestColor;
        }

        public void swapColors(Block block1, Block block2) {
            WritableRaster raster = image.getRaster();
            int[] pixel1 = new int[4];
            int[] pixel2 = new int[4];
            for (int x1 = block1.bottomLeft.x; x1 < block1.topRight.x; x1++) {
                for (int y1 = block1.bottomLeft.y; y1 < block1.topRight.y; y1++) {
                    int x2 = block2.bottomLeft.x + x1 - block1.bottomLeft.x;
                    int y2 = block2.bottomLeft.y + y1 - block1.bottomLeft.y;
                    pixel1 = raster.getPixel(x1, image.getHeight() - y1 - 1, pixel1);
                    pixel2 = raster.getPixel(x2, image.getHeight() - y2 - 1, pixel2);
                    raster.setPixel(x1, image.getHeight() - y1 - 1, pixel2);
                    raster.setPixel(x2, image.getHeight() - y2 - 1, pixel1);
                }
            }
        }

        public long lineCut(String blockId, String orientation, int offset) {
            Block block = blocks.remove(blockId);
            //System.out.println(String.format("lineCut: %s, %s, %d", block, orientation, offset));
            Block block1;
            Block block2;
            if (orientation.equalsIgnoreCase("x")) {
                block1 = new Block(
                        block.blockId + ".0",
                        block.bottomLeft,
                        new Point(offset, block.topRight.y),
                        block.color
                );
                block2 = new Block(
                        block.blockId + ".1",
                        new Point(offset, block.bottomLeft.y),
                        block.topRight,
                        block.color
                );
            } else {
                block1 = new Block(
                        block.blockId + ".0",
                        block.bottomLeft,
                        new Point(block.topRight.x, offset),
                        block.color
                );
                block2 = new Block(
                        block.blockId + ".1",
                        new Point(block.bottomLeft.x, offset),
                        block.topRight,
                        block.color
                );
            }
            addBlock(block1);
            addBlock(block2);
            return cost(MoveType.LINE_CUT, block, this);
        }

        public long pointCut(String blockId, Point offset) {
            Block block = blocks.remove(blockId);
            if (offset.y <= block.bottomLeft.y || offset.x <= block.bottomLeft.x || offset.y > block.topRight.y || offset.x > block.topRight.x) {
                throw new IllegalStateException("point is outside the bounding box");
            }

            List<Block> result = new ArrayList<>();
            addBlock(new Block(
                    block.blockId + ".0",
                    block.bottomLeft,
                    new Point(offset.x, offset.y),
                    block.color
            ));
            addBlock(new Block(
                    block.blockId + ".1",
                    new Point(offset.x, block.bottomLeft.y),
                    new Point(block.topRight.x, offset.y),
                    block.color
            ));
            addBlock(new Block(
                    block.blockId + ".2",
                    new Point(offset.x, offset.y),
                    block.topRight,
                    block.color
            ));
            addBlock(new Block(
                    block.blockId + ".3",
                    new Point(block.bottomLeft.x, offset.y),
                    new Point(offset.x, block.topRight.y),
                    block.color
            ));
            return cost(MoveType.POINT_CUT, block, this);
        }

        public long color(String blockId, int[] color, BufferedImage target) {
            Block block = blocks.get(blockId);
//            int[] bestColor = findBestColor(block, color, target);
//            System.out.println(
//                    String.format("Color blockId=%s, color=%s, bestColor=%s",
//                            blockId,
//                            arrToString(color),
//                            arrToString(bestColor)));
//            System.out.println("Color cost: " + blockDiff(block, target, color));
//            System.out.println("Best color cost: " + blockDiff(block, target, bestColor));
            block.setColor(color);
            applyColor(block);
            return cost(MoveType.COLOR, block, this);
        }

        public long swap(String blockId1, String blockId2) {
            Block block1 = blocks.get(blockId1);
            Block block2 = blocks.get(blockId2);
            Point bottomLeft = block1.bottomLeft;
            Point topRight = block1.topRight;
            block1.setBottomLeft(block2.bottomLeft);
            block1.setTopRight(block2.topRight);
            block2.setBottomLeft(bottomLeft);
            block2.setTopRight(topRight);
            swapColors(block1, block2);
            return cost(MoveType.SWAP, block1, this);
        }

        public long merge(String blockId1, String blockId2) {
            Block block1 = blocks.remove(blockId1);
            Block block2 = blocks.remove(blockId2);
            // System.out.println(String.format("Merge %s %s", block1, block2));
            long cost = Math.min(cost(MoveType.MERGE, block1, this), cost(MoveType.MERGE, block2, this));
            Point bottomLeft;
            Point topRight;
            if (block1.bottomLeft.x == block2.bottomLeft.x
                    && block1.topRight.x == block2.topRight.x) {
                 bottomLeft = new Point(block1.bottomLeft.x, Math.min(block1.bottomLeft.y, block2.bottomLeft.y));
                 topRight = new Point(block1.topRight.x, Math.max(block1.topRight.y, block2.topRight.y));
            } else if (block1.bottomLeft.y == block2.bottomLeft.y
                    && block1.topRight.y == block2.topRight.y) {
                bottomLeft = new Point(Math.min(block1.bottomLeft.x, block2.bottomLeft.x), block1.bottomLeft.y);
                topRight = new Point(Math.max(block1.topRight.x, block2.topRight.x), block1.topRight.y);
            } else {
                throw new IllegalStateException("Blocks are not compatible for merge");
            }
            blockCounter++;
            Block block = new Block(
                    Integer.toString(blockCounter),
                    bottomLeft,
                    topRight,
                    new int[4]
            );
            if (block.getSize() != block1.getSize() + block2.getSize()) {
                throw new IllegalStateException("merge failed");
            }
            addBlock(block);
            return cost;
        }
    }

    static class Block {
        final String blockId;
        Point bottomLeft;
        Point topRight;
        int[] color;

        public Block(String blockId, Point bottomLeft, Point topRight, int[] color) {
            this.blockId = blockId;
            this.bottomLeft = bottomLeft;
            this.topRight = topRight;
            this.color = color;
        }

        public long getSize() {
            return (long) (topRight.x - bottomLeft.x) * (topRight.y - bottomLeft.y);
        }

        public void setColor(int[] color) {
            this.color = color;
        }

        public void setBottomLeft(Point bottomLeft) {
            this.bottomLeft = bottomLeft;
        }

        public void setTopRight(Point topRight) {
            this.topRight = topRight;
        }

        @Override
        public String toString() {
            return "Block{" +
                    "blockId='" + blockId + '\'' +
                    ", bottomLeft=" + bottomLeft +
                    ", topRight=" + topRight +
                    '}';
        }
    }

    static class Point {
        final int x;
        final int y;

        public Point(int[] xy) {
            x = xy[0];
            y = xy[1];
        }

        public Point(int x, int y) {
            this.x = x;
            this.y = y;
        }

        @Override
        public String toString() {
            return "[" + x + ", " + y + "]";
        }
    }

}
